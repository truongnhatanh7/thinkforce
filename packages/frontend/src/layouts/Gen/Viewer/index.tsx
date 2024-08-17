import { Card, CardContent } from "@/components/ui/card";
import { handleGetDocInMD } from "@/repo/docMeta";
import React from "react";
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
  // Find run key word in fileName
  let refineFileName = decodeURIComponent(fileName);

  const res = await handleGetDocInMD(refineFileName);
  return res;
};

interface ViewerProps {}

const Viewer: React.FC<ViewerProps> = () => {
  const doc = useLoaderData();

  return (
    <div className="w-full h-full">
      <Card className="rounded-none">
        <CardContent>
          <Markdown className="markdown">{doc as string}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
};

export default Viewer;
