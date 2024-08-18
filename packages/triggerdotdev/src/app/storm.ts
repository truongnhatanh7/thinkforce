import { logger } from "@trigger.dev/sdk/v3";
import { batchWrite } from "../trigger/writeBatch";
import { getGenCost } from "./completion";
import { GOOGLE_SEARCH_PRICE } from "./const";
import { OutlineResponse, StormOutlineGen } from "./outline";
import { PolishEngine } from "./polish";
import { SearchResultItem } from "./search";
import { UploadEngine } from "./upload";
import { WriteArticleEngine, WriteArticleResponse } from "./writeArticle";

export interface StormResponse {
  data: {
    title: string;
    fileName: string;
    article: string;
  };
  metadata: {
    steps: {
      name: string;
      inputTokens?: number;
      outputTokens?: number;
      modelName: string;
      price: number;
      searchCost?: number;
      searchCount?: number;
    }[];
  };
}
export class StormEngine {
  runCfg: RunCfg;
  userId: string;
  sources: SearchResultItem[];

  constructor(runCfg: RunCfg, userId: string) {
    this.runCfg = runCfg;
    this.userId = userId;
    this.sources = [];
  }

  private performReferenceTemplating(article: string) {
    // Replace [link] to [number]
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      article = article.replaceAll(
        `[${source.link}]`,
        `[[${i + 1}]](${source.link})`,
      );
    }

    // Replace [number] to [[number]](link)
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      article = article.replaceAll(
        `[${i + 1}]`,
        `[[${i + 1}]](${source.link})`,
      );
    }

    const refSection = `\n# References\n${
      this.sources
        .map((source, i) => {
          return `${i + 1}. [${source.title}](${source.link})`;
        })
        .join("\n")
    }

    `;
    article += `\n\n${refSection}`;

    return article;
  }

  private transformOutline(outline: string) {
    let rr = [];
    for (let line of outline.split("\n")) {
      if (line.startsWith("#")) {
        rr.push(line);
      } else {
        rr[rr.length - 1] += "\n" + line;
      }
    }
    return rr;
  }

  async run(topic: string, outline = ""): Promise<StormResponse> {
    // Step 1: Generate Outline
    const outlineEngine = new StormOutlineGen(
      this.runCfg.outlineCfg.modelName,
      this.runCfg.outlineCfg.temperature,
    );

    let _outline: OutlineResponse = outlineEngine.initOutline();
    if (outline === "") {
      const generatedOutline = await outlineEngine.generateOutline(topic);
      _outline = generatedOutline;
    }
    // TODO: Else, improve the outline

    this.sources = _outline.sources;
    let rr = this.transformOutline(_outline.outline);
    logger.info("[Outline]", { _outline });

    // Step 2: Write Article
    const title = rr[0];
    let article: WriteArticleResponse[] = [{
      index: -1,
      content: title,
      inputGptTokens: 0,
      outputGptTokens: 0,
      sources: [],
    }];

    let writeInputTokens = 0;
    let writeOutputTokens = 0;

    let rrForWrite = rr.slice(1);
    let sections = await batchWrite.triggerAndWait({
      sections: rrForWrite.map((section, index) => ({
        modelName: this.runCfg.writeArticleCfg.modelName,
        temperature: this.runCfg.writeArticleCfg.temperature,
        index: index,
        section: section,
        outline: _outline.outline,
        topic: topic,
        sources: this.sources,
      })),
    });

    if (!sections.ok) {
      logger.error("[Batch Write]", { sections });
      throw new Error("Batch write failed");
    }
    sections.output.sort((a, b) => a.index - b.index);

    for (let sec of sections.output) {
      this.sources.push(...sec.sources);
      writeInputTokens += sec.inputGptTokens;
      writeOutputTokens += sec.outputGptTokens;
      article.push(sec);
    }

    logger.info("[Article]", { article });

    // Step 3: Post processing
    const polishEngine = new PolishEngine(
      this.runCfg.polishCfg.modelName,
      this.runCfg.polishCfg.temperature,
    );
    let textArticle = article.map((a) => a.content).join("\n\n");

    const polishedArticle = await polishEngine.polish(textArticle);
    textArticle = polishedArticle.content;
    textArticle = this.performReferenceTemplating(textArticle);

    logger.info("[Polished Article]", { textArticle });

    // Upload to R2
    const uploadEngine = new UploadEngine();
    await uploadEngine.uploadToR2(
      this.runCfg.runId,
      this.userId,
      textArticle,
    );

    return {
      data: {
        title: title,
        fileName: "",
        article: textArticle,
      },
      metadata: {
        steps: [
          {
            name: "Outline",
            inputTokens: _outline.inputTokens,
            outputTokens: _outline.outputTokens,
            modelName: this.runCfg.outlineCfg.modelName,
            price: getGenCost(
              this.runCfg.outlineCfg.modelName,
              _outline.inputTokens,
              _outline.outputTokens,
            ) +
              _outline.searchCount * GOOGLE_SEARCH_PRICE,
            searchCost: _outline.searchCount * GOOGLE_SEARCH_PRICE,
            searchCount: _outline.searchCount,
          },
          {
            name: "Write Article",
            inputTokens: writeInputTokens,
            outputTokens: writeOutputTokens,
            modelName: this.runCfg.writeArticleCfg.modelName,
            price: getGenCost(
              this.runCfg.writeArticleCfg.modelName,
              writeInputTokens,
              writeOutputTokens,
            ),
          },
          {
            name: "Polish",
            inputTokens: polishedArticle.inputTokens,
            outputTokens: polishedArticle.outputTokens,
            modelName: this.runCfg.polishCfg.modelName,
            price: getGenCost(
              this.runCfg.polishCfg.modelName,
              polishedArticle.inputTokens,
              polishedArticle.outputTokens,
            ),
          },
        ],
      },
    };
  }
}
