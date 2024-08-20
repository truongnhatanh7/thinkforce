import { envvars, logger } from "@trigger.dev/sdk/v3";
import { batchQa } from "../trigger/batchQa";
import { getModel } from "./completion";
import { ExaSearch } from "./exa";
import { SearchResultItem, SearchResults } from "./search";
import { batchPersonaQA } from "../trigger/batchPersona";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface PersonaPackage {
  persona: string;
  qaPairs: { question: string; answer: string }[];
}

export interface OutlineResponse {
  outline: string;
  sources: SearchResultItem[];
  inputTokens: number;
  outputTokens: number;
  searchCount: number;
}

export interface GenAnswerResponse {
  answer: string;
  persona: string;
  question: string;
  topic: string;
  sources: SearchResultItem[];
}

export class StormOutlineGen {
  modelName: string;
  temperature: number;
  inputTokens: number;
  outputTokens: number;
  naiveOutline: string;
  personas: PersonaPackage[];
  relatedTopics: string[];
  sources: SearchResultItem[];
  searchCount: number;
  // userId: string;
  // runId: string;

  constructor(
    modelName: string,
    temperature: number,
  ) {
    this.modelName = modelName;
    this.temperature = temperature;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.naiveOutline = "";
    this.personas = [];
    this.relatedTopics = [];
    this.sources = [];
    this.searchCount = 0;
    // this.userId = userId;
    // this.runId = runId;
  }

  initOutline(): OutlineResponse {
    return {
      outline: "",
      sources: [],
      inputTokens: 0,
      outputTokens: 0,
      searchCount: 0,
    };
  }

  private async generateNaiveOutline(topic: string): Promise<string> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    Write an outline for an article about a given topic.
    Here is the format of your writing: Use "# Title" to indicate section title , "## Subsection Title" to indicate subsection title.
    No more than 10 level 1 sections.
		The last section should be "Conclusion".
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

  async preSearch(topic: string): Promise<SearchResults> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a researcher that is looking for information about a topic.
    You are given a topic, you job is to reduce unnecessary word in the topic to make it a better search query.
    For example, for the topic "What is the effect of colchicine to your body", you can reduce it to "effect of colchicine".
    `;
    const USER_PROMPT = `Here's the topic: ${topic}`;
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

    if (!response) {
      throw new Error("Failed to generate search query");
    }
    this.outputTokens += response.usage_metadata?.output_tokens || 0;
    this.inputTokens += response.usage_metadata?.input_tokens || 0;
    const refinedQuery = response.content.toString();
    logger.info("Refined query", { refinedQuery });

    const searchEngine = new ExaSearch();
    const res = await searchEngine.search(refinedQuery, topic, 20);
    return res;
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

  async generateContext(
    topic: string,
    userId: string,
    runId: string,
  ): Promise<string> {
    const supabaseUrl = await envvars.retrieve("SUPABASE_URL");
    const supabaseKey = await envvars.retrieve("SUPABASE_SERVICE_KEY");
    const supa = createClient(supabaseUrl.value, supabaseKey.value);

    // For each personas, gen 3 questions base on persona
    await supa.from("doc_meta").update({
      status: "searching",
    }).eq("user_id", userId).eq("run_id", runId);

    const search = await this.preSearch(topic);
    this.sources = search.results;

    await supa.from("doc_meta").update({
      status: "persona",
    }).eq("user_id", userId).eq("run_id", runId);

    const batchPersonaQARun = await batchPersonaQA.triggerAndWait({
      modelName: this.modelName,
      temperature: this.temperature,
      personas: this.personas.map((persona) => persona.persona),
      topic,
      sources: search.results,
    });

    if (!batchPersonaQARun.ok) {
      logger.error("Failed to generate questions", { batchPersonaQARun });
      return "";
    }

    // Map batchPersonaQARun to personas
    this.personas = batchPersonaQARun.output.map((persona) => {
      if (persona.length === 0) {
        return { persona: "", qaPairs: [] };
      }
      const personaType = persona[0].persona;

      const personaQAPairs = persona.map(
        (qa: { question: any; answer: any }) => {
          return { question: qa.question, answer: qa.answer };
        },
      );
      return { persona: personaType, qaPairs: [...personaQAPairs] };
    });

    logger.info("Final Persona Package", { personas: this.personas });

    // Stringify the context
    return JSON.stringify(this.personas);
  }

  async generateQuestions(
    persona: string,
    topic: string,
  ): Promise<string[]> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a interviewer that is talking to a ${persona} about ${topic}
    Your job is to generate ONLY 3 questions that are relevant to the topic.
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

  async generateAnswer(
    persona: string,
    question: string,
    topic: string,
    sources: SearchResultItem[],
  ): Promise<GenAnswerResponse> {
    this.sources = sources;

    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a ${persona} and you are asked a question about the topic.
    Your job is to generate an answer to the question.
    Only use information in the given context.
    `;
    const USER_PROMPT = `
    Here's the topic: ${topic}

    Here's the question:${question}

    Here's the context:${
      this.sources
        .map((result) => result.content)
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
      this.inputTokens += response.usage_metadata?.input_tokens || 0;
      this.outputTokens += response.usage_metadata?.output_tokens || 0;
      this.searchCount += 1;
      return {
        answer: response.content.toString(),
        persona: persona,
        question: question,
        topic: topic,
        sources: this.sources,
      };
    }

    return {
      answer: "",
      persona: persona,
      question: question,
      topic: topic,
      sources: this.sources,
    };
  }

  private async refineOutline(context: string, topic: string): Promise<string> {
    const model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are given a draft outline, a topic, related topics and different context related to this topic.
    Your task is to refine the outline based on the context.
    Here is the format of your writing: Use "# Title" to indicate section title , "## Subsection Title" to indicate subsection title.
    You could modify the draft outline based on given information.
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

  private async nonRepeatableOutline(outline: string): Promise<string> {
    let model = await getModel(this.modelName, this.temperature);
    const SYSTEM_PROMPT = `
    You are a researcher that is good at refining the outline of a report for a writer.
    Given a report, you job is to wording parts that sounds repetitive so that when the writer reads it, they will know what to write and avoid repetition.

    You MUST follow these rules STRICTLY:
    - You MUST KEEP the same format of the outline.
    - You MUST NOT add any extra information.
    - Only return the refined outline, don't add any irrelevant words.
    `;
    const USER_PROMPT = `
    Here's the outline: ${outline}
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

  async generateOutline(
    topic: string,
    userId: string,
    runId: string,
  ): Promise<OutlineResponse> {
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
    const context = await this.generateContext(topic, userId, runId);
    logger.info("Generated context", { context });

    // Refine outline based on context
    const refinedOutline = await this.refineOutline(context, topic);

    // Refine the outline to remove repetition
    const nonRepeatableOutline = await this.nonRepeatableOutline(
      refinedOutline,
    );

    logger.info("Refined outline", {
      naiveOutline: this.naiveOutline,
      naiveOutlineLength: this.naiveOutline.length,
      nonRepeatableOutline,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    });

    return {
      outline: nonRepeatableOutline,
      sources: this.sources,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      searchCount: this.searchCount,
    };
  }
}
