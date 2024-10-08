import { getModel } from "./completion";
import { SearchResultItem } from "./search";

export interface WriteArticleResponse {
  index: number;
  content: string;
  inputGptTokens: number;
  outputGptTokens: number;
  sources: SearchResultItem[];
}

export class WriteArticleEngine {
  inputGptTokens: number;
  outputGptTokens: number;

  constructor(private modelName: string, private temperature: number) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.inputGptTokens = 0;
    this.outputGptTokens = 0;
  }

  async writeSection(
    index: number,
    outline: string,
    section: string,
    _topic: string,
    sources: SearchResultItem[],
  ): Promise<WriteArticleResponse> {
    const model = await getModel(this.modelName, this.temperature);

    const SYSTEM_PROMPT = `
    You are a educator writer.
		I will give you an outline, a current section of that outline, and context (including references). 
		You will generate the paragraph of the section using the provided context.

		You MUST follow these rules STRICTLY:
		1. Your response MUST be in markdown format. 
    2. ONLY USE information provided by the context, if the provided information is not enough, you say "There's not enough information to answer this question" for that part only.
    3. Your output MUST HAVE references based on the context provided
    4. If there's quantitative data provided by the context, you MUST include it in your response to justify your writing.
    5. You MUST follow this format for your writing:
      - Use "#" Title" to indicate section title, "##" Title" to indicate subsection title, "###" Title" to indicate subsubsection title, and so on.
      - Use [1], [2], ..., [n] in line (for example, "The capital of the United States is Washington, D.C.[1][3]."). Don't join the numbers with a comma. 
      - DON't use [1, 2, 3, ...] to indicate multiple sources for a single fact. Only use [1][2]...[n] for each fact.
      - No more than 3 sources per inline citation.
      - You MUST NOT include a References or Sources section to list the sources at the end.
    `;

    const USER_PROMPT = `
    Here are the outline: ${outline}

    Section that you HAVE TO write: ${section}
  
    Here are some context for the section:
    ${
      sources
        ?.map(
          (context, index) =>
            `${
              index + 1
            }. Title: ${context.title} | Reference: ${context.link} | Content: ${context.content}`,
        )
        .join("\n")
    }
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
      for (let i = 0; i < sources.length; i++) {
        sec = sec.replaceAll(`[${i + 1}]`, `[${sources[i].link}]`);
      }

      return {
        index: index,
        content: sec,
        inputGptTokens: this.inputGptTokens,
        outputGptTokens: this.outputGptTokens,
        sources: sources,
      };
    }

    return {
      index: index,
      content: "",
      inputGptTokens: this.inputGptTokens,
      outputGptTokens: this.outputGptTokens,
      sources: sources,
    };
  }
}
