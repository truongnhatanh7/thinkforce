import { Context, logger, task } from "@trigger.dev/sdk/v3";
import { StormEngine } from "../app/storm";
import { TRIGGER_INVOKE_COST, TRIGGER_TIME_COST } from "../app/const";

export const stormieEngine = task({
  id: "stormie-engine-debug",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15, // 15 minutes,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "free-tier",
    concurrencyLimit: 2,
  },
  machine: {
    preset: "micro",
  },
  run: async (
    payload: { title: string; outline: string; userId?: string },
    parmas: { ctx: Context },
  ) => {
    logger.info("Result", {
      data: "# Debug article",
      triggerCost: {
        time: 10, // convert to seconds
        cost: 10,
      },
      stepsMeta: 10,
      // trigger cost + gen cost at each step + search cost
      totalCost: 10,
    });
    return {
      data: {
        fileName: "",
        article: "# Debug article",
      },
      metadata: {
        steps: [],
      },
    };
  },
});
