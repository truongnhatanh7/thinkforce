import { Context, logger, task } from "@trigger.dev/sdk/v3";
import { StormEngine } from "../app/storm";
import { TRIGGER_INVOKE_COST, TRIGGER_TIME_COST } from "../app/const";

export const stormieEngine = task({
  id: "stormie-engine",
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
    // Start time
    const startTime = Date.now();
    const runId = parmas.ctx.run.id;

    if (!payload.userId) {
      payload.userId = "anonymous" + new Date().getTime().toString();
    }

    // Set the configuration
    const runCfg: RunCfg = {
      runId: runId,
      outlineCfg: {
        modelName: "gemini-1.5-flash",
        temperature: 0,
      },
      writeArticleCfg: {
        modelName: "gpt-4o-mini",
        temperature: 0,
      },
      polishCfg: {
        modelName: "gpt-4o-mini",
        temperature: 0,
      },
    };

    // Run the Storm Engine
    const stormie = new StormEngine(runCfg, payload.userId);
    const res = await stormie.run(payload.title, payload.outline);

    // Cost calculation
    const elapsedTime = (Date.now() - startTime) / 1000;
    const triggerCost = elapsedTime * TRIGGER_TIME_COST + TRIGGER_INVOKE_COST;
    const totalCost = res.metadata.steps.reduce((acc, step) => {
      return acc + step.price;
    }, 0) + triggerCost;

    logger.info("Result", {
      data: res.data.article,
      triggerCost: {
        time: elapsedTime / 1000, // convert to seconds
        cost: triggerCost,
      },
      stepsMeta: res.metadata.steps,
      // trigger cost + gen cost at each step + search cost
      totalCost: totalCost,
    });
    return res;
  },
});
