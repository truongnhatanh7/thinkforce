import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { envvars, logger } from "@trigger.dev/sdk/v3";
import { TRIGGER_PROJECT_NAME } from "../../trigger.config";
import { getModel } from "./completion";
import { GoogleSearch } from "./google";
import {
  TFGoogleSearchFusion,
  TFGoogleSearchFusionData,
} from "@thinkforce/shared";

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
  modelName: string;
  temperature: number;
  userId: string;
  inputGptTokens: number;
  outputGptTokens: number;
  searchTokens = 0;

  constructor(modelName: string, temperature: number, userId: string) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.userId = userId;
    this.inputGptTokens = 0;
    this.outputGptTokens = 0;
  }

  async generateRelatedTopic(topic: string): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    I want to write a short SEO article about a topic. 
    I will give you the topic and I want you to suggest 3 related sub-topics to expand the content.
    The sub-topics should be separated by commas.
    Only return the sub-topics, don't add any other content.
    `;
    const USER_PROMPT = `Here's the topic:\n\nTOPIC:${topic}`;
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
      const topics = response.content
        .toString()
        .split(",")
        .map((topic: string) => topic.trim());
      return topics;
    }

    return [];
  }

  async generateKeywords(topic: string): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    I want to write a SEO article about a topic. 
    Generate SEO keywords and hash tags to improve the visibility of the article. 
    The keywords should be relevant to the topic and should be able to attract more readers. 
    The keywords should be separated by commas.
    Only return the keywords, don't add any other content.
    Only return 10 keywords.
    `;
    const USER_PROMPT = `Here's the topic:\n\nTOPIC:${topic}`;

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
      const keywords = response.content
        .toString()
        .split(",")
        .map((keyword: string) => keyword.trim());

      this.inputGptTokens += response.usage_metadata?.input_tokens || 0;
      this.outputGptTokens += response.usage_metadata?.output_tokens || 0;
      return keywords;
    }

    return [];
  }

  async generateQuestion(
    topic: string,
    perspective: string,
    history: string[]
  ) {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are an experienced writer and want to edit a SEO article about a given topic .
    Please ask no more than one question at a time and don't ask what you have asked before.
    Your questions should be related to the topic you want to write.\n\nConversation history: ${history.join(
      "\n"
    )}\n\n
    `;
    const USER_PROMPT = `Here's the topic:\n\nTOPIC:${topic}\n\nYour specific focus: ${perspective}\n\nQuestion:`;
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
      return response.content.toString();
    }

    return "";
  }

  async generateAnswer(topic: string, question: string, context: string) {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are an expert who can use information effectively . You are chatting with a writer who wants to write an article on topic you know .
    You have gathered the related information and will now use the information to form a response.
    Make your response as informative as possible and make sure every sentence is supported by the gathered information.\n\nRelated information: ${context}\n\n
    `;
    const USER_PROMPT = `Here's the topic:\n\nTOPIC:${topic}\n\nQuestion: ${question}`;
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
      return response.content.toString();
    }

    return "";
  }

  async generateOutline(topic: string) {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    Write an outline for an article about a given topic.
    Here is the format of your writing: Use "# Title" to indicate section title , "## Subsection Title" to indicate subsection title.
		The last section should be "Conclusion".

    Must be MAXIMUM 3 sections at all levels.
    `;
    const USER_PROMPT = `Here's the topic:\n\nTOPIC:${topic}`;
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
      return response.content.toString();
    }

    return "";
  }

  async search(query: string, topic: string): Promise<TFGoogleSearchFusion> {
    const google = new GoogleSearch();
    return await google.search(query, topic);
  }

  private encodeHeadingToUrl(heading: string): string {
    heading = heading.replace("#", "").trim();

    // if it starts with 1. or 1.1. or 1.1.1. etc, remove it.
    const regex = /^\d+(\.\d+){0,4}\./;
    if (regex.test(heading)) {
      heading = heading.replace(regex, "");
    }

    heading = heading.trim();

    return heading.replace(" ", "-").toLowerCase();
  }

  private async refineHeading(article: string) {
    let cnt = 1;
    for (let line of article.split("\n")) {
      if (line.startsWith("## ")) {
        let original_line = line;
        // Sometime it highlights the heading up. Remove it.
        line = line.replace(line, line.replace(":", ""));
        line = line.replace(line, line.replace("**", ""));

        // Add numbers to the main headings.
        line = line.replace("## ", "");

        // Clean it & add marker so it works on pdfs.
        article = article.replace(
          original_line,
          `<a id='${this.encodeHeadingToUrl(line)}'></a>\n## ${cnt}. ${line}`
        );
        cnt += 1;
      } // This applies to h3++ headings.
      else if (line.startsWith("###")) {
        // Only add number to the main headings. Subheadings are not numbered, we only clean and add links.
        let original_line = line;
        // Sometime it highlights the heading up. Remove it.
        line = line.replace(line, line.replace(":", ""));
        line = line.replace(line, line.replace("**", ""));
        article = article.replace(
          original_line,
          `<a id='${this.encodeHeadingToUrl(line)}'></a>\n${line}`
        );
      }
    }

    return article;
  }

  async newS3Client(): Promise<S3Client> {
    const endpoint = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_ENDPOINT"
    );

    const accessKeyId = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_ACCESS_KEY_ID"
    );

    const secretAccessKey = await envvars.retrieve(
      TRIGGER_PROJECT_NAME,
      "dev",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY"
    );

    return new S3Client({
      region: "auto",
      endpoint: endpoint.value,
      credentials: {
        accessKeyId: accessKeyId.value,
        secretAccessKey: secretAccessKey.value,
      },
    });
  }

  async uploadToR2(topic: string, article: string) {
    const s3Client = await this.newS3Client();
    logger.info("Init s3 client");
    const createdAt = new Date().getTime().toString();
    const fileName = `${this.userId}/${topic.replaceAll(
      "_",
      ""
    )}_${createdAt}.md`;
    // Convert article to md
    const putObjectCommand = new PutObjectCommand({
      Bucket: "hyper-document",
      Key: fileName,
      Body: article,
      Metadata: {
        topic: topic,
        created_at: createdAt,
      },
    });
    await s3Client.send(putObjectCommand);
    logger.info("uploaded", {
      fileName: fileName,
    });
  }

  refineSection(section: string) {
    // Remove the first ```markdown and last ```
    section = section.replace("```markdown", "");
    section = section.replace("```", "");

    // Remove the first and last new line
    section = section.trim();

    // Remove the first and last new line
    section = section.trim();
    return section;
  }

  async writeArticle(topic: string, outline = ""): Promise<StormResponse> {
    this.searchTokens = 0;

    let _outline = outline;
    if (_outline === "") {
      _outline = await this.generateOutline(topic);
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

    for (let sectionOutline of rr.slice(1)) {
      let sec = await this.writeSection(_outline, sectionOutline, topic);
      logger.info("[Section]", { sec });

      sec = this.refineSection(sec);

      article += sec + "\n\n";
    }
    logger.info("[Article]", { article });

    // Upload to R2
    await this.uploadToR2(topic, article);

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
