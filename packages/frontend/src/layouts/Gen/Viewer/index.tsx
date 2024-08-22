import { useGetDocQuery } from "@/api/useDocQuery";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { marked } from "marked";
import React, { useRef } from "react";
import Markdown from "react-markdown";
import {
  LoaderFunction,
  LoaderFunctionArgs,
  useLoaderData,
} from "react-router-dom";

export const viewerDocLoader: LoaderFunction = async ({
  params,
}: LoaderFunctionArgs) => {
  const fileName = params.fileName;
  if (!fileName) {
    throw new Error("File name is required");
  }
  let refineFileName = decodeURIComponent(fileName);
  return refineFileName;
};

interface ViewerProps {}

const Viewer: React.FC<ViewerProps> = () => {
  const docDataRef = useRef<HTMLDivElement>(null);
  const fileName = useLoaderData();

  const doc = useGetDocQuery((fileName as string) || "");

  // const handleGetPresignedUrl = async (runId: string) => {
  //   setIsLoading(true);
  //   const session = await supabase.auth.getSession();
  //   const userId = session.data.session?.user.id;
  //   const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "");
  //   baseUrl.pathname = "/functions/v1/backend/gen/poll";
  //   baseUrl.searchParams.append("userId", userId || "");
  //   baseUrl.searchParams.append("runId", runId || "");
  //   try {
  //     const req = await fetch(baseUrl, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${session.data.session?.access_token}`,
  //       },
  //     });
  //     const res = await req.json();
  //     setIsLoading(false);
  //     return res.signedUrl;
  //   } catch (err) {
  //     setIsLoading(false);
  //     console.error(err);
  //     return "";
  //   }
  // };

  const handleGetDownloadLink = async () => {
    const htmlString = await marked(doc?.data as string);
    const blob = new Blob([htmlString], { type: "text/html" });
    // Create an object URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample.html"; // Set the file name

    // Programmatically click the anchor to trigger the download
    a.click();

    // Clean up by revoking the object URL
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full">
      <Card className="rounded-none w-full h-full">
        <CardHeader>
          <Button
            onClick={() => {
              handleGetDownloadLink();
            }}
            className="flex gap-1"
            disabled={doc.isLoading}
          >
            {doc.isLoading ? <Spinner /> : "Download as HTML"}
          </Button>
        </CardHeader>
        <CardContent>
          {doc.isLoading ? (
            <div className="w-full h-screen grid place-items-center">
              <div className=" scale-[250%]">
                <Spinner />
              </div>
            </div>
          ) : (
            <div className="" ref={docDataRef}>
              <Markdown className="markdown">{doc.data as string}</Markdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Viewer;
