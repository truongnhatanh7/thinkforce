import { Context, logger, task, usage } from "@trigger.dev/sdk/v3";
import { StormEngine } from "../app/storm";

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
    name: "default",
    concurrencyLimit: 1,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: { title: string; outline: string; userId?: string },
    parmas: { ctx: Context },
  ) => {
    // Start time
    const runId = parmas.ctx.run.id;

    if (!payload.userId) {
      payload.userId = "anonymous" + new Date().getTime().toString();
    }

    // Set the configuration
    const runCfg: RunCfg = {
      runId: runId,
      outlineCfg: {
        modelName: "gpt-4o-mini",
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

    const triggerCost = usage.getCurrent();
    const triggerCostInUSD = triggerCost.totalCostInCents / 100;
    const totalCost = res.metadata.steps.reduce((acc, step) => {
      return acc + step.price;
    }, 0) + triggerCostInUSD;

    logger.info("Result", {
      data: res.data.article,
      triggerCost: {
        cost: triggerCost,
      },
      stepsMeta: res.metadata.steps,
      // trigger cost + gen cost at each step + search cost
      totalCost: totalCost,
    });
    return res;
  },
});
