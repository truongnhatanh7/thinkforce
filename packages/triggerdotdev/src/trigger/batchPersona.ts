import { task } from "@trigger.dev/sdk/v3";
import { StormOutlineGen } from "../app/outline";
import { SearchResultItem } from "../app/search";
import { personaQA } from "./persona";

export const batchPersonaQA = task({
  id: "batchPersonaQA",
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
      personas: string[];
      topic: string;
      sources: SearchResultItem[];
    },
  ) => {
    const outlineEngine = new StormOutlineGen(
      payload.modelName,
      payload.temperature,
    );

    const batchPersonaQARun = await personaQA.batchTriggerAndWait(
      payload.personas.map((persona) => ({
        payload: {
          modelName: payload.modelName,
          temperature: payload.temperature,
          persona: persona,
          topic: payload.topic,
          sources: payload.sources,
        },
      })),
    );

    let isOk = false;
    if (batchPersonaQARun.runs.every((run) => run.ok)) {
      isOk = true;
    }

    if (!isOk) {
      throw new Error("Some runs are not ok");
    }

    return batchPersonaQARun.runs.map((run) => (run as any)!.output);
  },
});
