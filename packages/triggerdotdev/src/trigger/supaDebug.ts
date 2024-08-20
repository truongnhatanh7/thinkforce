import { SupabaseClient } from "@supabase/supabase-js";
import { envvars, task } from "@trigger.dev/sdk/v3";

export const supaDebug = task({
  id: "supaDebug",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000 * 60 * 15,
    factor: 2,
    randomize: true,
  },
  queue: {
    name: "qa",
    concurrencyLimit: 10,
  },
  machine: {
    preset: "small-1x",
  },
  run: async (
    payload: {},
  ) => {
    const supaUrl = await envvars.retrieve("SUPABASE_URL");
    const supaKey = await envvars.retrieve("SUPABASE_SERVICE_KEY");

    const supa = new SupabaseClient(supaUrl.value, supaKey.value);

    const req = await supa.from("doc_meta").update({
      status: "writing",
    }).eq("user_id", "43b90495-177c-4e26-abcd-72d07ba8e160").eq(
      "run_id",
      "run_n269nsiambw3sxssphuxc",
    );

    return req;
  },
});
