import { logger } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "./outline";
import { PolishEngine } from "./polish";
import { UploadEngine } from "./upload";
import { WriteArticleEngine } from "./writeArticle";

export interface StormResponse {
  data: {
    fileName: string;
    article: string;
  };
  metadata: {
    inputGptTokens: number;
    outputGptTokens: number;
  };
}
export class StormEngine {
  runCfg: RunCfg;
  userId: string;
  inputGptTokens: number;
  outputGptTokens: number;

  constructor(runCfg: RunCfg, userId: string) {
    this.runCfg = runCfg;
    this.userId = userId;
    this.inputGptTokens = 0;
    this.outputGptTokens = 0;
  }

  async run(topic: string, outline = ""): Promise<StormResponse> {
    let _outline = outline;
    if (_outline === "") {
      const outlineEngine = new StormOutlineGen(
        this.runCfg.outlineCfg.modelName,
        this.runCfg.outlineCfg.temperature
      );
      const generatedOutline = await outlineEngine.generateOutline(topic);
      _outline = generatedOutline.outline;
      this.inputGptTokens += generatedOutline.inputTokens;
      this.outputGptTokens += generatedOutline.outputTokens;
    }

    logger.info("[Outline]", { _outline });

    let rr = [];
    for (let line of _outline.split("\n")) {
      if (line.startsWith("#")) {
        rr.push(line);
      } else {
        rr[rr.length - 1] += "\n" + line;
      }
    }

    let article = "";
    const writeArticleEngine = new WriteArticleEngine(
      this.runCfg.writeArticleCfg.modelName,
      this.runCfg.writeArticleCfg.temperature
    );

    for (let sectionOutline of rr.slice(1)) {
      let sec = await writeArticleEngine.writeSection(
        _outline,
        sectionOutline,
        topic
      );
      logger.info("[Section]", { sec });
      this.inputGptTokens += sec.inputGptTokens;
      this.outputGptTokens += sec.outputGptTokens;
      article += sec.content + "\n\n";
    }
    logger.info("[Article]", { article });

    const uploadEngine = new UploadEngine();
    await uploadEngine.uploadToR2(this.userId, topic, article, "original_");

    const polishEngine = new PolishEngine(
      this.runCfg.polishCfg.modelName,
      this.runCfg.polishCfg.temperature
    );
    const polishedArticle = await polishEngine.polish(article);
    article = polishedArticle.content;
    this.inputGptTokens += polishedArticle.inputTokens;
    this.outputGptTokens += polishedArticle.outputTokens;

    logger.info("[Polished Article]", { article });

    // Upload to R2
    await uploadEngine.uploadToR2(this.userId, topic, article, "polished_");

    return {
      data: {
        fileName: "",
        article: article,
      },
      metadata: {
        inputGptTokens: this.inputGptTokens,
        outputGptTokens: this.outputGptTokens,
      },
    };
  }
}
