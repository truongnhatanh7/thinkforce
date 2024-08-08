import type { TriggerConfig } from "@trigger.dev/sdk/v3";

export const TRIGGER_PROJECT_NAME = "proj_lqlwqnlrbabgvacsfslw";

export const config: TriggerConfig = {
  project: TRIGGER_PROJECT_NAME,
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
};
