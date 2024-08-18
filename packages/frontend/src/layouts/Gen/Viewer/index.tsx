import { useGetDocQuery } from "@/api/useDocQuery";
import { Spinner } from "@/components/spinner";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import Markdown from "react-markdown";
import {
  LoaderFunction,
  LoaderFunctionArgs,
  useLoaderData
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
  const fileName = useLoaderData();

  const doc = useGetDocQuery((fileName as string) || "");

  return (
    <div className="w-full h-full">
      <Card className="rounded-none w-full h-full">
        <CardContent>
          {doc.isLoading ? (
            <div className="w-full h-screen grid place-items-center">
              <div className=" scale-[250%]">
                <Spinner />
              </div>
            </div>
          ) : (
            <Markdown className="markdown">{doc.data as string}</Markdown>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Viewer;
