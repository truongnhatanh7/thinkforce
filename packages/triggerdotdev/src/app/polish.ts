import { TFGoogleSearchFusionData } from "@thinkforce/shared";
import { getModel } from "./completion";
import { WriteArticleResponse } from "./writeArticle";
import { logger } from "@trigger.dev/sdk/v3";

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
    sources: TFGoogleSearchFusionData[]
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
      return `${index + 1}. Title: ${source.title} | Link: ${
        source.link
      } | Summary: ${source.content}`;
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

  async polish(content: string): Promise<PolishResponse> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at finding repeated information in the article and deleting them to make sure there is no repetition in the article. 
    You MUST keep other's non-repeated part in the article.
    The article is in markdown format.
    You will keep the inline citations and article structure (indicated by "#", "##", etc.) appropriately. 
    You just return the polished article, don't add any extra information.
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
