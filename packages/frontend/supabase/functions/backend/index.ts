import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
// import { createClient } from "jsr:@supabase/supabase-js@2";

const functionName = "backend";
const app = new Hono().basePath(`/${functionName}`);

app.use(cors());

// Init supabase client
// const connectionString = Deno.env.get("X_SUPABASE_DB_URL")!;

app.post("/hello-world", async (c) => {
  const { name } = await c.req.json();
  return new Response(`Hello ${name}!`);
});

app.get("/", (c) => {
  return c.json({ message: "Hello, World!" });
});

app.post("/gen/emit", async (c) => {
  const body = await c.req.json();
  const userId = body.userId;

  // const supabase = createClient(
  //   Deno.env.get("X_SUPABASE_URL") ?? "",
  //   Deno.env.get("X_SUPABASE_ANON_KEY") ?? "",
  //   {
  //     global: {
  //       headers: { Authorization: c.req.header("Authorization") || "" },
  //     },
  //   },
  // );

  // // Call RPC check for is generating
  // const checkIsGen = await supabase.from("gen_usage").select(
  //   "is_generating",
  // );

  // if (checkIsGen.error) {
  //   throw new Error(checkIsGen.error?.message ?? "");
  // }

  // const updateIsGen = await supabase.from("gen_usage").update({
  //   is_generating: true,
  // });

  // if (updateIsGen.error) {
  //   throw new Error("Failed to update is generating");
  // }

  // Get current hour and minute
  // Only be able to trigger 1 event per minute
  const currentHourAndMinute = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  console.log(currentHourAndMinute);

  // Emit event to trigger.dev
  const taskName = "hello-world";
  try {
    const req = await fetch(
      `https://api.trigger.dev/api/v1/tasks/${taskName}/trigger`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("TRIGGER_KEY") ?? ""}`,
        },
        method: "POST",
        body: JSON.stringify({
          "payload": {
            "name": "Supabase",
          },
          "context": {
            "user": userId,
          },
          "options": {
            "queue": {
              "name": "default",
              "concurrencyLimit": 1,
            },
            "concurrencyKey": userId,
            "idempotencyKey": userId + currentHourAndMinute,
          },
        }),
      },
    );
    const res = await req.json();
    console.log(res);
    return c.json(res);
  } catch (e) {
    console.log(e);
  }
});

app.post("/gen/poll", async (c) => {
  // Poll for status
  const runId = c.req.queries("runId") || "";

  // TODO: If completed, call RPC to deduct money and update is_generating
  try {
    const req = await fetch(
      `https://api.trigger.dev/api/v3/runs/${runId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("TRIGGER_KEY") ?? ""}`,
        },
        method: "GET",
      },
    );
    const res = await req.json();
    console.log(res);
    return c.json(res);
  } catch (e) {
    console.log(e);
  }
});

Deno.serve(app.fetch);
