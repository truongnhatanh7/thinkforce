import { handleGetDocInMD, handleListDoc } from "@/repo/docMeta";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useListDocQuery = () => {
  return useQuery({
    queryKey: ["list-docs"],
    queryFn: async () => {
      return await handleListDoc();
    },
  });
};

export const useGetDocQuery = (fileName: string) => {
  return useQuery({
    queryKey: ["get-doc", fileName],
    queryFn: async () => {
      return await handleGetDocInMD(fileName);
    },
  });
};
