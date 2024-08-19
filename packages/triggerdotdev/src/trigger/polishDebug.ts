import { task } from "@trigger.dev/sdk/v3";
import { PolishEngine } from "../app/polish";
import { polishTestData } from "../testdata/polishTestData";

export const polishDebug = task({
  id: "polishDebug",
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
  run: async () => {
    const polishEngine = new PolishEngine("gpt-4o-mini", 0);

    const res = await polishEngine.polishV2(polishTestData);

    return res;
  },
});
