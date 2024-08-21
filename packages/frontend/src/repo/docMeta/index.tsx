import { supabase } from "@/supabase";

export interface DocMeta {
  title: string;
  userId: string;
  file_name: string;
}

export const handleListDoc = async (): Promise<DocMeta[]> => {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id || "";

  const { data, error } = await supabase
    .from("doc_meta")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(10); // Only 10 for now

  if (error) {
    throw new Error(error.message);
  }

  return data.map((doc) => ({
    title: doc?.title || "",
    userId: doc?.user_id || "",
    file_name: doc?.file_name || "",
  }));
};

export const handleGetDocInMD = async (fileName: string) => {
  // TODO: call edge func to get the doc in markdown
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  const userId = session.data.session?.user.id || "";
  const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "");
  baseUrl.pathname = "/functions/v1/backend/doc";
  baseUrl.searchParams.set("fileName", fileName);
  baseUrl.searchParams.set("userId", userId);

  const req = await fetch(baseUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const res = await req.json();

  console.log(res);

  const mdContentReq = await fetch(res.signedUrl, {
    method: "GET",
    headers: {
      "Access-Control-Allow-Origin": import.meta.env.VITE_URL || "",
      "Access-Control-Allow-Methods": "GET",
    },
  });
  const mdContent = await mdContentReq.text();

  return mdContent;
};

export const handleGetLatestDoc = async () => {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id || "";
  const doc = await supabase
    .from("doc_meta")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (doc.error) {
    throw new Error(doc.error.message);
  }

  return doc.data;
};
