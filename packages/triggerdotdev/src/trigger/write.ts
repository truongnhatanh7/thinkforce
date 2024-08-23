import { task } from "@trigger.dev/sdk/v3";
import { SearchResultItem } from "../app/search";
import { WriteArticleEngine, WriteArticleResponse } from "../app/writeArticle";

export const write = task({
  id: "write",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "write",
    concurrencyLimit: 10,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {
      modelName: string;
      temperature: number;
      index: number;
      section: string;
      outline: string;
      topic: string;
      sources: SearchResultItem[];
    },
  ): Promise<WriteArticleResponse> => {
    const lines = payload.section.split("\n");
    if (lines.length === 1) {
      return {
        index: payload.index,
        content: payload.section,
        inputGptTokens: 0,
        outputGptTokens: 0,
        sources: payload.sources,
      };
    }

    const writeEngine = new WriteArticleEngine(
      payload.modelName,
      payload.temperature,
    );

    return await writeEngine.writeSection(
      payload.index,
      payload.outline,
      payload.section,
      payload.topic,
      payload.sources,
    );
  },
});
