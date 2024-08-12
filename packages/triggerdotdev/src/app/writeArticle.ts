import { TFGoogleSearchFusion } from "@thinkforce/shared";
import { GoogleSearch } from "./google";
import { getModel } from "./completion";

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
    outline: string,
    section: string,
    topic: string
  ): Promise<string> {
    const model = await getModel(this.modelName, this.temperature);

    // Using perplexity
    const { data } = await this.search(section, topic);

    const SYSTEM_PROMPT = `
    You are a blog writer that write about a given topic to target public audience.
		I will give you an outline and a title of current section of a report and several references. 
		You will generate the article of the section using the provided references.
		The outline use "# <Title>" to indicate section title , "## <Subsection Title>" to indicate subsection title.
		You MUST follow these rules strictly:
		1. Your response MUST be in markdown format. 
		2. You MUST include the references in the article.
		3. Your writing must be relevant to the current section.
		4. If your section is not the last section, you MUST NOT include a conclusion.
    5. Only use the information and citations provided in the context.
		6. If you section is the sub-section, and there is a sub-section after it, you could use transitions if applicable.

	Here are the outline:
	${outline}

	Here are some context for the section:
  ${data
    ?.map(
      (context, index) =>
        `${index + 1}. Title: ${context.title} | Reference: ${
          context.link
        } | Content: ${context.content}`
    )
    .join("\n")}
    `;

    const USER_PROMPT = `SECTION OUTLINE: ${section}`;
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
      return response.content.toString();
    }

    return "";
  }

  async search(query: string, topic: string): Promise<TFGoogleSearchFusion> {
    const google = new GoogleSearch();
    return await google.search(query, topic);
  }
}
