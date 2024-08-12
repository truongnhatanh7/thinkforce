import { logger, task } from "@trigger.dev/sdk/v3";
import { StormEngine } from "../app/storm";
import { StormOutlineGen } from "../app/outline";
export const outlineEngine = task({
  id: "outline-engine",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15, // 15 minutes,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "free-tier",
    concurrencyLimit: 3,
  },
  machine: {
    preset: "micro",
  },
  run: async (payload: { topic: string }) => {
    // Start time
    const startTime = Date.now();

    const outlineEngine = new StormOutlineGen("gpt-4o-mini", 0.5);
    const outline = await outlineEngine.generateOutline(payload.topic);
    const elapsedTime = (Date.now() - startTime) / 1000;

    logger.info("Result", {
      outline: outline,
      triggerCost: {
        time: elapsedTime / 1000, // convert to seconds
        cost: elapsedTime * 0.0000169 + 0.000025,
      },
    });
    return outline;
  },
});
