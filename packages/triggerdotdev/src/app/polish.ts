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

  async polish(content: string): Promise<PolishResponse> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at polishing article before publish. 
    The article is in markdown format.
    You MUST perform the following tasks:
    - You MUST delete repetion part and keep other's non-repeated part in the article.
    - You MUST KEEP the inline citations in this format (for example, "The capital of the United States is Washington, D.C.[http://example.com][http://example2.com][http://example3.com].").
    - You will keep article structure (indicated by "#", "##", etc.) appropriately. 
    - You just return the polished article, don't add any extra information.
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
