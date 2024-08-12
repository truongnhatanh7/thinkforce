import { getModel } from "./completion";

interface PolishResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export class PolishEngine {
  inputTokens: number;
  outputTokens: number;

  constructor() {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }

  async smallPolish(content: string): Promise<PolishResponse> {
    const model = await getModel("gpt-4o-mini", 0);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at finding repeated information in the article and deleting them to make sure there is no repetition in the article. 
    You MUST keep other's non-repeated part in the article.
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

  async polish(content: string): Promise<PolishResponse> {
    const model = await getModel("gpt-4o", 0);
    const SYSTEM_PROMPT = `
    You are a faithful text editor that is good at finding repeated information in the article and deleting them to make sure there is no repetition in the article. 
    You won't delete any non-repeated part in the article. 
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
        inputTokens: this.inputTokens * 17,
        outputTokens: this.outputTokens * 17,
      };
    }

    return {
      content: content,
      inputTokens: this.inputTokens * 17,
      outputTokens: this.outputTokens * 17,
    };
  }
}
