import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "npm:@aws-sdk/client-s3";
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

  console.log("[Start emitting]", userId, title);

  const supabase = createClient(
    Deno.env.get("X_SUPABASE_URL") ?? "",
    Deno.env.get("X_SUPABASE_SERVICE_KEY") ?? "",
    {
      global: {
        headers: { Authorization: c.req.header("Authorization") || "" },
      },
    },
  );

  const tokens = await supabase.from("gen_usage").select(
    "tokens",
  ).eq("user_id", userId).single();

  if (tokens.error) {
    throw new Error(tokens.error?.message ?? "");
  }

  if ((tokens!.data!.tokens as unknown as number) <= 0) {
    throw new Error("Not enough tokens");
  }

  // Get current hour and minute
  // Only be able to trigger 1 event per minute
  const currentHourAndMinute = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Emit event to trigger.dev
  const taskName = "stormie-engine";
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
            "concurrencyKey": "default",
            "idempotencyKey": userId + currentHourAndMinute,
          },
        }),
      },
    );

    const res = await req.json();

    const docMetaReq = await supabase.from("doc_meta").insert({
      title,
      file_name: `${userId}/${res.id}.md`,
      user_id: userId,
      run_id: res.id,
      status: "started",
    });

    if (docMetaReq.error) {
      throw new Error(docMetaReq.error?.message ?? "");
    }

    const tokens = await supabase.from("gen_usage").select(
      "tokens",
    ).eq("user_id", userId).single();

    if (tokens.error) {
      throw new Error(tokens.error?.message ?? "");
    }

    const deductToken = await supabase.from("gen_usage").update({
      tokens: (tokens!.data!.tokens as unknown as number) - 10,
    }).eq("user_id", userId);

    if (deductToken.error) {
      console.log(deductToken.error);
      throw new Error("Failed to deduct token");
    }

    return c.json(res);
  } catch (e) {
    console.log(e);
  }
});

app.post("/gen/poll", async (c) => {
  // Poll for status
  const runId = c.req.query("runId") || "";
  const userId = c.req.query("userId") || "";

  console.log(runId, userId);

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

      return c.json({
        ...res,
        signedUrl,
      });
    }
    return c.json(res);
  } catch (e) {
    console.log(e);
    return c.json({ e });
  }
});

app.get("/doc", async (c) => {
  const fileName = c.req.query("fileName") || "";
  const userId = c.req.query("userId") || "";
  console.log(fileName, userId);

  const supabase = createClient(
    Deno.env.get("X_SUPABASE_URL") ?? "",
    Deno.env.get("X_SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: c.req.header("Authorization") || "" },
      },
    },
  );

  const docMeta = await supabase.from("doc_meta").select(
    "file_name",
  ).eq("user_id", userId).eq("file_name", `${fileName}`).single();

  if (docMeta.error) {
    throw new Error(docMeta.error?.message ?? "");
  }

  if (!docMeta.data) {
    throw new Error("Doc not found");
  }

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
      Key: `${fileName}`,
    }),
    { expiresIn: 3600 },
  );

  return c.json({ signedUrl });
});

app.post("/v2/gen", async (c) => {
  const body = await c.req.json();
  const userId = body.userId;
  const title = body.title;
  const refinedTitle = title.replaceAll(" ", "_") + "_" + new Date().getTime();
  const fileName = `${userId}/${refinedTitle}.md`;

  const supabase = createClient(
    Deno.env.get("X_SUPABASE_URL") ?? "",
    Deno.env.get("X_SUPABASE_SERVICE_KEY") ?? "",
    {
      global: {
        headers: { Authorization: c.req.header("Authorization") || "" },
      },
    },
  );

  // Check tokens
  const preTokenCheck = await supabase.from("gen_usage").select(
    "tokens",
  ).eq("user_id", userId).single();

  if (preTokenCheck.error) {
    throw new Error(preTokenCheck.error?.message ?? "");
  }

  if ((preTokenCheck!.data!.tokens as unknown as number) <= 0) {
    throw new Error("Not enough tokens");
  }

  // Call Storm
  const baseUrl = new URL(Deno.env.get("AWS_BE_V2_URL") || "");
  baseUrl.pathname = "/storm";
  baseUrl.searchParams.set("topic", title);
  console.log(baseUrl.toString());

  const req = await fetch(baseUrl.toString(), {
    method: "POST",
  });
  const res = await req.text();

  console.log(res);

  // Upload to R2
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

  const putCommand = new PutObjectCommand({
    Bucket: Deno.env.get("R2_BUCKET_NAME") || "",
    Key: fileName,
    Body: res,
  });

  await S3.send(putCommand);

  // Update doc meta
  const docMetaReq = await supabase.from("doc_meta").insert({
    title,
    file_name: fileName,
    user_id: userId,
    run_id: refinedTitle,
    status: "started",
  });

  if (docMetaReq.error) {
    throw new Error(docMetaReq.error?.message ?? "");
  }

  const tokens = await supabase.from("gen_usage").select(
    "tokens",
  ).eq("user_id", userId).single();

  if (tokens.error) {
    throw new Error(tokens.error?.message ?? "");
  }

  const deductToken = await supabase.from("gen_usage").update({
    tokens: (tokens!.data!.tokens as unknown as number) - 10,
  }).eq("user_id", userId);

  if (deductToken.error) {
    console.log(deductToken.error);
    throw new Error("Failed to deduct token");
  }

  return c.json({ message: "Success" });
});

Deno.serve(app.fetch);
