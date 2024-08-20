import { task } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "../app/outline";
import { SearchResultItem } from "../app/search";
import { batchQa } from "./batchQa";
import { qa } from "./qa";

export interface PersonaQAResponse {
  persona: string;
  question: string;
  answer: string;
}

export const personaQA = task({
  id: "personaQA",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "qa",
    concurrencyLimit: 10,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {
      modelName: string;
      temperature: number;
      persona: string;
      topic: string;
      sources: SearchResultItem[];
    },
  ) => {
    const outlineEngine = new StormOutlineGen(
      payload.modelName,
      payload.temperature,
    );

    const questions = await outlineEngine.generateQuestions(
      payload.persona,
      payload.topic,
    );

    const qaRes = await batchQa.triggerAndWait({
      modelName: payload.modelName,
      temperature: payload.temperature,
      sources: payload.sources,
      items: questions.map((question) => {
        return {
          persona: payload.persona,
          question: question,
          topic: payload.topic,
        };
      }),
    });

    if (!qaRes.ok) {
      throw new Error("Some runs are not ok");
    }

    return qaRes.output.map((qaPair) => {
      return ({
        persona: qaPair.persona,
        question: qaPair.question,
        answer: qaPair.answer,
      } as PersonaQAResponse);
    });
  },
});
