import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { GetObjectCommand, S3Client } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "jsr:@supabase/supabase-js@2";

const functionName = "backend";
const app = new Hono().basePath(`/${functionName}`);

app.use(cors());

app.get("/", (c) => {
  return c.json({ message: "Hello, World!" });
});

app.post("/gen/emit", async (c) => {
  const body = await c.req.json();
  const userId = body.userId;
  const title = body.title;

  const supabase = createClient(
    Deno.env.get("X_SUPABASE_URL") ?? "",
    Deno.env.get("X_SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: c.req.header("Authorization") || "" },
      },
    },
  );

  const tokens = await supabase.from("gen_usage").select(
    "tokens",
  ).single();

  if (tokens.error) {
    throw new Error(tokens.error?.message ?? "");
  }

  if ((tokens!.data!.tokens as unknown as number) <= 0) {
    throw new Error("Not enough tokens");
  }

  // Call RPC check for is generating
  const checkIsGen = await supabase.from("gen_usage").select(
    "is_generating",
  );

  if (checkIsGen.error) {
    throw new Error(checkIsGen.error?.message ?? "");
  }

  const updateIsGen = await supabase.from("gen_usage").update({
    is_generating: true,
  }).eq("user_id", userId);

  if (updateIsGen.error) {
    console.log(updateIsGen.error);
    throw new Error("Failed to update is generating");
  }

  // Get current hour and minute
  // Only be able to trigger 1 event per minute
  const currentHourAndMinute = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Emit event to trigger.dev
  const taskName = "stormie-engine-debug";
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
            "title": title,
            "userId": userId,
            "outline": "",
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
    return c.json(res);
  } catch (e) {
    console.log(e);
  }
});

app.post("/gen/poll", async (c) => {
  // Poll for status
  const runId = c.req.queries("runId") || "";
  const userId = c.req.queries("userId") || "";

  const supabase = createClient(
    Deno.env.get("X_SUPABASE_URL") ?? "",
    Deno.env.get("X_SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: c.req.header("Authorization") || "" },
      },
    },
  );

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

    if (res.status === "COMPLETED") {
      const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${
          Deno.env.get("R2_ACCOUNT_ID") || ""
        }.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") || "",
          secretAccessKey: Deno.env.get("R2_SECRET_KEY") || "",
        },
      });

      const signedUrl = await getSignedUrl(
        S3,
        new GetObjectCommand({
          Bucket: Deno.env.get("R2_BUCKET_NAME") || "",
          Key: `${userId}/${runId}.md`,
        }),
        { expiresIn: 3600 },
      );

      const tokens = await supabase.from("gen_usage").select(
        "tokens",
      ).single();

      if (tokens.error) {
        throw new Error(tokens.error?.message ?? "");
      }

      const deductToken = await supabase.from("gen_usage").update({
        is_generating: false,
        tokens: (tokens!.data!.tokens as unknown as number) - 10,
      }).eq("user_id", userId);

      if (deductToken.error) {
        console.log(deductToken.error);
        throw new Error("Failed to deduct token");
      }

      return c.json({
        ...res,
        signedUrl,
      });
    }
    return c.json(res);
  } catch (e) {
    console.log(e);

    const resetIsGenerating = await supabase.from("gen_usage").update({
      is_generating: false,
    }).eq("user_id", userId);

    if (resetIsGenerating.error) {
      console.log(resetIsGenerating.error);
      throw new Error("Failed to reset is generating");
    }
  }
});

Deno.serve(app.fetch);
