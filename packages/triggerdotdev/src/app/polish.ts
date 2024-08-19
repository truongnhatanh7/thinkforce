import { TFGoogleSearchFusionData } from "@thinkforce/shared";
import { getModel } from "./completion";
import { WriteArticleResponse } from "./writeArticle";
import { logger } from "@trigger.dev/sdk/v3";
import { before } from "node:test";

interface PolishResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export class PolishEngine {
  inputTokens: number;
  outputTokens: number;
  modelName: string;
  temperature: number;

  constructor(modelName: string, temperature: number) {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.modelName = modelName;
    this.temperature = temperature;
  }

  async performPostRef(
    article: WriteArticleResponse[],
    sources: TFGoogleSearchFusionData[],
  ) {
    let finalArticle = [];

    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a writer that is good at citing sources.
    Given a paragraph and a list of sources with summary of each sources, you will add inline citations to the paragraph.
    If the sentence in the paragraph already has inline citations, you will leave it as is.
    If the sentence in the paragraph is not suitable for inline citations, you will leave it as is.
    You MUST keep the paragraph's original meaning.
    Use [1], [2], ..., [n] in line (for example, "The capital of the United States is Washington, D.C.[1][3]."). You DO NOT need to include a References or Sources section to list the sources at the end.
    `;

    const transformedSources = sources.map((source, index) => {
      return `${
        index + 1
      }. Title: ${source.title} | Link: ${source.link} | Summary: ${source.content}`;
    });

    for (const paragraph of article) {
      const USER_PROMPT = `
      Here's the paragraph: 
      ${paragraph.content}
  
      Here are the sources:
      ${transformedSources.join("\n")}
      `;

      const completion = await model?.invoke([
        {
          type: "system",
          content: SYSTEM_PROMPT,
        },
        {
          type: "user",
          content: USER_PROMPT,
        },
      ]);

      if (completion) {
        this.inputTokens += completion.usage_metadata?.input_tokens || 0;
        this.outputTokens += completion.usage_metadata?.output_tokens || 0;
        finalArticle.push(completion.content.toString());
        logger.info("PolishEngine post ref", {
          before: paragraph.content,
          after: completion.content.toString(),
        });
      }
    }

    return finalArticle;
  }

  private deepExtractSections(sections: {
    index: number;
    content: string;
  }[]) {
    // When meet '#' -> take current index till meet '\n'
    let result: {
      index: number;
      content: string;
    }[] = [];
    // let newSecIndex = 0;
    // for (const sec of sections) {
    //   let secContent = sec.content;

    //   for (let i = 0; i < secContent.length; i++) {
    //     let startIdx = i;
    //     if (secContent[i] === "#") {
    //       while (i < secContent.length && secContent.charAt(i) !== "\n") {
    //         i++;
    //       }

    //       const content = secContent.substring(startIdx, i);
    //       result.push({
    //         index: newSecIndex,
    //         content: content,
    //       });
    //       newSecIndex++;
    //     }
    //   }

    // }
    let idx = 0;
    for (const sec of sections) {
      const subSections = sec.content.split("\n");
      for (const subSec of subSections) {
        if (subSec === "") {
          continue;
        }

        result.push({
          index: idx++,
          content: subSec,
        });
      }
    }

    logger.info("deepExtractSections", {
      sections: result,
    });

    return result;
  }

  async polishV2(sections: WriteArticleResponse[], k = 100) {
    let refinedSections = sections.map((sec) => ({
      index: sec.index,
      content: sec.content,
    }));

    refinedSections = this.deepExtractSections(refinedSections);
    let reducedSections = refinedSections.map((sec) => (
      {
        index: sec.index,
        content: sec.content.substring(0, k),
      }
    ));

    logger.info("PolishEngine polishV2", {
      sections: sections.map((sec) => ({
        index: sec.index,
        content: sec.content.substring(0, k),
      })),
      reducedSections,
    });

    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at polishing article before publish. 
    You are given a JSON object with a list of sections. Each section has an index and a content.
    You MUST perform the following tasks:
    - You MUST delete repetion part and keep other's non-repeated part in the article.
    - With multiple repeated sections, keep the one with the lowest index. Eg: With sections [1, 2, 3, 4, 5], if sections 2, 3, 4 are the same, you will keep section 2.
    - STRICTLY Return a JSON array of indexes, don't add any extra words or information. Eg: [1, 2, 3, 4, 5]
    `;
    const USER_PROMPT = `
    Here's the JSON: 
    ${JSON.stringify(reducedSections)}
    `;
    const completion = await model?.invoke([
      {
        type: "system",
        content: SYSTEM_PROMPT,
      },
      {
        type: "user",
        content: USER_PROMPT,
      },
    ]);

    if (completion) {
      this.inputTokens += completion.usage_metadata?.input_tokens || 0;
      this.outputTokens += completion.usage_metadata?.output_tokens || 0;

      logger.info("PolishEngine polishV2", {
        raw: completion.content.toString(),
      });

      const indexes: string[] = JSON.parse(completion.content.toString());
      logger.info("PolishEngine polishV2", {
        before: sections,
        after: indexes,
      });

      let finalSections: WriteArticleResponse[] = [];
      for (const index of indexes) {
        const foundSection = refinedSections.find((sec) =>
          sec.index === parseInt(index)
        );
        if (foundSection) {
          finalSections.push({
            index: foundSection.index,
            content: foundSection.content,
            inputGptTokens: 0,
            outputGptTokens: 0,
            sources: [],
          });
        }
      }
      logger.info("PolishEngine polishV2", {
        finalSections,
      });
      return {
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
        sections: finalSections,
      };
    }
  }

  async polish(content: string): Promise<PolishResponse> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at polishing article before publish. 
    The article is in markdown format.
    You MUST perform the following tasks:
    - You MUST delete repetion part and keep other's non-repeated part in the article.
    - You will keep the inline citations in this format (for example, "The capital of the United States is Washington, D.C.[1][3][7].").
    - You will keep article structure (indicated by "#", "##", etc.) appropriately. 
    - You just return the polished article, don't add any extra information.
    Do your job for the following article.
    `;
    const USER_PROMPT = `
    Here's the article: 
    ${content}
    `;
    const completion = await model?.invoke([
      {
        type: "system",
        content: SYSTEM_PROMPT,
      },
      {
        type: "user",
        content: USER_PROMPT,
      },
    ]);

    if (completion) {
      this.inputTokens += completion.usage_metadata?.input_tokens || 0;
      this.outputTokens += completion.usage_metadata?.output_tokens || 0;
      return {
        content: completion.content.toString(),
        inputTokens: this.inputTokens,
        outputTokens: this.outputTokens,
      };
    }

    return {
      content: content,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }
}
