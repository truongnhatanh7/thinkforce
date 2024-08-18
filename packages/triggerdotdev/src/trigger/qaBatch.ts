import { task } from "@trigger.dev/sdk/v3";
import { SearchResultItem } from "../app/search";
import { qa } from "./qa";

export const batchQa = task({
  id: "qaBatch",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "qaBatch",
    concurrencyLimit: 2,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {
      modelName: string;
      temperature: number;
      sources: SearchResultItem[];
      items: {
        persona: string;
        question: string;
        topic: string;
      }[];
    },
  ) => {
    const results = await qa.batchTriggerAndWait(payload.items.map(
      (item) => ({
        payload: {
          modelName: payload.modelName,
          temperature: payload.temperature,
          persona: item.persona,
          question: item.question,
          topic: item.topic,
          sources: payload.sources,
        },
      }),
    ));

    // Check if every runs are ok
    let isOk = false;
    if (results.runs.every((run) => run.ok)) {
      isOk = true;
    }

    if (!isOk) {
      throw new Error("Some runs are not ok");
    }

    return results.runs.map((run) => (run as any)!.output);
  },
});
