import { logger } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "./outline";
import { PolishEngine } from "./polish";
import { UploadEngine } from "./upload";
import { WriteArticleEngine } from "./writeArticle";
import { TFGoogleSearchFusionData } from "@thinkforce/shared";

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
  sources: TFGoogleSearchFusionData[];

  constructor(runCfg: RunCfg, userId: string) {
    this.runCfg = runCfg;
    this.userId = userId;
    this.inputGptTokens = 0;
    this.outputGptTokens = 0;
    this.sources = [];
  }

  private performReferenceTemplating(article: string) {
    // Replace [link] to [number]
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      article = article.replaceAll(
        `[${source.link}]`,
        `[[${i + 1}]](${source.link})`
      );
    }

    // Replace [number] to [[number]](link)
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      article = article.replaceAll(
        `[${i + 1}]`,
        `[[${i + 1}]](${source.link})`
      );
    }

    const refSection = `\n# References\n${this.sources
      .map((source, i) => {
        return `${i + 1}. [${source.title}](${source.link})`;
      })
      .join("\n")}

    `;
    article += `\n\n${refSection}`;

    return article;
  }

  async run(topic: string, outline = ""): Promise<StormResponse> {
    // Step 1: Generate Outline
    let _outline = outline;
    if (_outline === "") {
      const outlineEngine = new StormOutlineGen(
        this.runCfg.outlineCfg.modelName,
        this.runCfg.outlineCfg.temperature
      );
      const generatedOutline = await outlineEngine.generateOutline(topic);
      _outline = generatedOutline.outline;
      this.sources = generatedOutline.sources;
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

    // Step 2: Write Article
    let article = [];
    const writeArticleEngine = new WriteArticleEngine(
      this.runCfg.writeArticleCfg.modelName,
      this.runCfg.writeArticleCfg.temperature
    );

    for (let sectionOutline of rr.slice(1)) {
      let sec = await writeArticleEngine.writeSection(
        _outline,
        sectionOutline,
        topic,
        this.sources
      );
      logger.info("[Section]", { sec });
      this.sources.push(...sec.sources);
      this.inputGptTokens += sec.inputGptTokens;
      this.outputGptTokens += sec.outputGptTokens;
      article.push(sec);
    }

    logger.info("[Article]", { article });

    // Step 3: Post processing
    const polishEngine = new PolishEngine(
      this.runCfg.polishCfg.modelName,
      this.runCfg.polishCfg.temperature
    );    
    let textArticle = article.map((a) => a.content).join("\n\n");

    const polishedArticle = await polishEngine.polish(textArticle);
    textArticle = polishedArticle.content;
    textArticle = this.performReferenceTemplating(textArticle);
    
    this.inputGptTokens += polishedArticle.inputTokens;
    this.outputGptTokens += polishedArticle.outputTokens;
    
    logger.info("[Polished Article]", { textArticle });
    
    // Upload to R2
    const uploadEngine = new UploadEngine();
    await uploadEngine.uploadToR2(this.userId, topic, textArticle, "polished_");

    return {
      data: {
        fileName: "",
        article: textArticle,
      },
      metadata: {
        inputGptTokens: this.inputGptTokens,
        outputGptTokens: this.outputGptTokens,
      },
    };
  }
}
