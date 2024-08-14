import { logger } from "@trigger.dev/sdk/v3";
import { getModel } from "./completion";
import { GoogleSearch } from "./google";
import { TFGoogleSearchFusionData } from "@thinkforce/shared";

interface PersonaPackage {
  persona: string;
  qaPairs: { question: string; answer: string }[];
}

interface OutlineResponse {
  outline: string;
  sources: TFGoogleSearchFusionData[];
  inputTokens: number;
  outputTokens: number;
}

export class StormOutlineGen {
  modelName: string;
  temperature: number;
  inputTokens: number;
  outputTokens: number;
  naiveOutline: string;
  personas: PersonaPackage[];
  relatedTopics: string[];
  sources: TFGoogleSearchFusionData[];

  constructor(modelName: string, temperature: number) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.naiveOutline = "";
    this.personas = [];
    this.relatedTopics = [];
    this.sources = [];
  }

  private async generateNaiveOutline(topic: string): Promise<string> {
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      return response.content.toString();
    }

    return "";
  }

  async generateRelatedTopics(topic: string): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are given a topic, you job is to generate 3 related topics based on the topic.
    For example, for the topic "Gout Treatment", you can generate personas like "Natural Gout Treatment", "New Gout Treatment", "Gout Surgery".
    Return the result as a string with each topics separated by comma. For example: "Natural Gout Treatment,New Gout Treatment,Gout Surgery".
    Don't add any irrelevant words. Just return the result only.
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      return response.content.toString().split(",");
    }

    return [];
  }

  async generatePersonas(topic: string): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are given a topic, you job is to generate 3 personas based on the topic.
    For example, for the topic "Artificial Intelligence", you can generate personas like "AI Researcher", "AI Developer", "AI Ethicist".
    Return the result as a string with each persona separated by comma. For example: "AI Researcher,AI Developer,AI Ethicist".
    Don't add any irrelevant words. Just return the result only.
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      return response.content.toString().split(",");
    }

    return ["Expert", "Novice", "Hobbyist"];
  }

  private sourceArToObj(): { [key: string]: TFGoogleSearchFusionData } {
    const obj: { [key: string]: TFGoogleSearchFusionData } = {};
    for (let i = 0; i < this.sources.length; i++) {
      obj[`${this.sources[i].link}`] = this.sources[i];
    }
    return obj;
  }

  async generateContext(topic: string): Promise<string> {
    // For each personas, gen 3 questions base on persona

    for (const persona of this.personas) {
      logger.info("Generating questions for persona", { persona });
      const questions = await this.generateQuestions(persona.persona, topic);
      logger.info("Generated questions", { questions });
      for (const question of questions) {
        const answer = await this.generateAnswer(
          persona.persona,
          question,
          topic
        );
        logger.info("Generated answer", { persona, question, answer });
        persona.qaPairs.push({ question, answer });
      }
    }

    // Stringify the context
    return JSON.stringify(this.personas);
  }

  private async generateQuestions(
    persona: string,
    topic: string
  ): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a interviewer that is talking to a ${persona} about ${topic}
    Your job is to generate 3 questions that are relevant to the topic.
    Don't add any irrelevant words. Just return the result only.
    Return the result as a string with each question separated by comma. For example: What is the topic?,Why is the topic important?,How does the topic work?
    `;
    const USER_PROMPT = `
    Here's the topic:\n\nTOPIC:${topic}
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      return response.content.toString().split(",");
    }

    return [
      "What is the topic?",
      "Why is the topic important?",
      "How does the topic work?",
    ];
  }

  private async generateAnswer(
    persona: string,
    question: string,
    topic: string
  ): Promise<string> {
    logger.info("Generating answer", { persona, question, topic });
    // Step 1: Search for answer
    const searchEngine = new GoogleSearch(this.sourceArToObj());
    const searchResults = await searchEngine.search(question, topic);
    this.sources.push(...searchResults.data);
    this.inputTokens += searchResults.inputTokens;
    this.outputTokens += searchResults.outputTokens;
    logger.info("Search results", { searchResults });

    // Step 2: Generate answer
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a ${persona} and you are asked a question about the topic.
    Your job is to generate an answer to the question.
    Only use information in the given context.
    `;
    const USER_PROMPT = `
    Here's the topic: ${topic}

    Here's the question:${question}

    Here's the context:${searchResults.data
      .map((result) => result.content)
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      logger.info("Generated answer", {
        persona,
        question,
        topic,
        answer: response.content.toString(),
      });
      return response.content.toString();
    }

    return "";
  }

  private async refineOutline(context: string, topic: string): Promise<string> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are given a draft outline, a topic, related topics and different context related to this topic.
    Your task is to refine the outline based on the context.
    Here is the format of your writing: Use "# Title" to indicate section title , "## Subsection Title" to indicate subsection title.
    You could modify the draft outline based on given information.
    Must be MAXIMUM 3 sections at all levels.
    Take a deep breath and think carefully about the context before refining the outline.
    `;
    const USER_PROMPT = `
    Here's the topic: ${topic}

    Here are related topics: ${this.relatedTopics.join(",")}

    Here's the draft outline:${this.naiveOutline}

    Here's the context:${context}
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      return response.content.toString();
    }

    return "";
  }

  async generateOutline(topic: string): Promise<OutlineResponse> {
    // Gen naive outline
    this.naiveOutline = await this.generateNaiveOutline(topic);

    // Gen related topics
    this.relatedTopics = await this.generateRelatedTopics(topic);

    // Gen peronas based on topic
    const personas = await this.generatePersonas(topic);
    logger.info("Generated personas", { personas });

    this.personas = personas.map((persona) => {
      return { persona, qaPairs: [] };
    });

    // Iterate over personas and and generate context
    const context = await this.generateContext(topic);
    logger.info("Generated context", { context });

    // Refine outline based on context
    const refinedOutline = await this.refineOutline(context, topic);

    logger.info("Refined outline", {
      naiveOutline: this.naiveOutline,
      naiveOutlineLength: this.naiveOutline.length,
      refinedOutline,
      refinedOutlineLength: refinedOutline.length,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    });

    return {
      outline: refinedOutline,
      sources: this.sources,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }
}
