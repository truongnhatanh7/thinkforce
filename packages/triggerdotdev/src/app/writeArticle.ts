import {
  TFGoogleSearchFusion,
  TFGoogleSearchFusionData,
} from "@thinkforce/shared";
import { GoogleSearch } from "./google";
import { getModel } from "./completion";

export interface WriteArticleResponse {
  content: string;
  inputGptTokens: number;
  outputGptTokens: number;
  sources: TFGoogleSearchFusionData[];
}

export interface TruthySource {}

export class WriteArticleEngine {
  inputGptTokens: number;
  outputGptTokens: number;
  sources: TFGoogleSearchFusionData[];

  constructor(private modelName: string, private temperature: number) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.inputGptTokens = 0;
    this.outputGptTokens = 0;
    this.sources = [];
  }

  async writeSection(
    outline: string,
    section: string,
    topic: string
  ): Promise<WriteArticleResponse> {
    const model = await getModel(this.modelName, this.temperature);

    // Using perplexity
    const { data } = await this.search(section, topic);
    this.sources = data;

    const SYSTEM_PROMPT = `
    You are a educator writer.
		I will give you an outline, a current section of that outline, and context (including references). 
		You will generate the paragraph of the section using the provided context.

		You MUST follow these rules strictly:
		1. Your response MUST be in markdown format. 
    2. ONLY USE information provided by the context
    3. Your output MUST HAVE references based on the context provided
    4. You MUST follow this format for your writing:
      - Use "#" Title" to indicate section title, "##" Title" to indicate subsection title, "###" Title" to indicate subsubsection title, and so on.
      - Use [1], [2], ..., [n] in line (for example, "The capital of the United States is Washington, D.C.[1][3]."). You DO NOT need to include a References or Sources section to list the sources at the end.
    `;

    const USER_PROMPT = `
    Here are the outline: ${outline}

    Section that you HAVE TO write: ${section}
  
    Here are some context for the section:
    ${this.sources
      ?.map(
        (context, index) =>
          `${index + 1}. Title: ${context.title} | Reference: ${
            context.link
          } | Content: ${context.content}`
      )
      .join("\n")}
    `;
    const response = await model?.invoke([
      {
        type: "system",
        content: SYSTEM_PROMPT,
      },
      {
        type: "user",
        content: USER_PROMPT,
      },
    ]);

    if (response) {
      this.inputGptTokens += response.usage_metadata?.input_tokens || 0;
      this.outputGptTokens += response.usage_metadata?.output_tokens || 0;

      let sec = response.content.toString();
      for (let i = 0; i < this.sources.length; i++) {
        sec = sec.replaceAll(`[${i + 1}]`, `[${this.sources[i].link}]`);
      }

      return {
        content: sec,
        inputGptTokens: this.inputGptTokens,
        outputGptTokens: this.outputGptTokens,
        sources: this.sources,
      };
    }

    return {
      content: "",
      inputGptTokens: this.inputGptTokens,
      outputGptTokens: this.outputGptTokens,
      sources: this.sources,
    };
  }

  async search(query: string, topic: string): Promise<TFGoogleSearchFusion> {
    const google = new GoogleSearch();
    return await google.search(query, topic);
  }
}