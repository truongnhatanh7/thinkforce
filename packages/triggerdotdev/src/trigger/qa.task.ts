import { task } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "../app/outline";
import { SearchResultItem } from "../app/search";

export const qa = task({
  id: "qa",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "qa",
    concurrencyLimit: 5,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {
      modelName: string;
      temperature: number;
      persona: string;
      question: string;
      topic: string;
      sources: SearchResultItem[];
    },
  ) => {
    const outlineEngine = new StormOutlineGen(
      payload.modelName,
      payload.temperature,
    );

    return await outlineEngine.generateAnswer(
      payload.persona,
      payload.question,
      payload.topic,
      payload.sources,
    );
  },
});
