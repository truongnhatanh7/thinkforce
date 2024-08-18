import { handleCheckTokens } from "@/repo/genUsage";
import { useQuery } from "@tanstack/react-query";

export const useTokensQuery = () => {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: async () => {
      return await handleCheckTokens();
    },
  });
};
