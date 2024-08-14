import { logger, task } from "@trigger.dev/sdk/v3";
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
    name: "free-tier",
    concurrencyLimit: 3,
  },
  machine: {
    preset: "micro",
  },
  run: async (payload: { title: string; outline: string; userId?: string }) => {
    // Start time
    const startTime = Date.now();

    if (!payload.userId) {
      payload.userId = "anonymous" + new Date().getTime().toString();
    }

    const runCfg: RunCfg = {
      outlineCfg: {
        modelName: "gemini-1.5-flash",
        temperature: 0,
        inputPrice: 0.075,
        outputPrice: 0.3,
      },
      writeArticleCfg: {
        modelName: "gpt-4o-mini",
        temperature: 0,
        inputPrice: 0.15,
        outputPrice: 0.6,
      },
      polishCfg: {
        modelName: "gpt-4o-mini",
        temperature: 0,
        inputPrice: 0.15,
        outputPrice: 0.6,
      },
    };

    const stormie = new StormEngine(runCfg, payload.userId);

    const res = await stormie.run(payload.title, payload.outline);
    const elapsedTime = (Date.now() - startTime) / 1000;

    const worstLLMCost =
      (res.metadata.inputGptTokens * 0.15 +
        res.metadata.outputGptTokens * 0.3) /
      1000000;

    logger.info("Result", {
      data: res.data.article,
      triggerCost: {
        time: elapsedTime / 1000, // convert to seconds
        cost: elapsedTime * 0.0000169 + 0.000025,
      },
      gptCost: {
        inputTokens: res.metadata.inputGptTokens,
        outputTokens: res.metadata.outputGptTokens,
      },
      totalCost: elapsedTime * 0.0000169 + 0.000025 + worstLLMCost,
    });
    return res;
  },
});
