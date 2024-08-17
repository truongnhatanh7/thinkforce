import { supabase } from "@/supabase";

export const handleCheckTokens = async () => {
  const session = await supabase.auth.getSession();
  const userId = session.data.session?.user.id || "";

  const { data, error } = await supabase
    .from("gen_usage")
    .select("tokens")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  return data?.tokens || 0;
};
