import { task } from "@trigger.dev/sdk/v3";
import { SearchResultItem } from "../app/search";
import { write } from "./write";

export const batchWrite = task({
  id: "batchWrite",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "write",
    concurrencyLimit: 1,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {
      sections: {
        modelName: string;
        temperature: number;
        index: number;
        section: string;
        outline: string;
        topic: string;
        sources: SearchResultItem[];
      }[];
    },
  ) => {
    const results = await write.batchTriggerAndWait(
      payload.sections.map((section) => ({
        payload: section,
      })),
    );

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
