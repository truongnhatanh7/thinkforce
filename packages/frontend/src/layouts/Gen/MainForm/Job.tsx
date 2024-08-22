import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tables } from "@/repo/database.types";
import { supabase } from "@/supabase";
import React, { useEffect, useState } from "react";
import { marked } from "marked";

export interface JobProps {
  doc: Tables<"doc_meta">;
}

const Job: React.FC<JobProps> = ({ doc }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleResolveProgress = () => {
    switch (doc?.status) {
      case "started":
        return 5;
      case "searching":
        return 20;
      case "persona":
        return 30;
      case "refining":
        return 50;
      case "writing":
        return 60;
      case "polishing":
        return 80;
      case "uploading":
        return 90;
      case "completed":
        return 100;
      case "error":
        return 0;
      default:
        return 0;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setProgress(handleResolveProgress()), 500);
    return () => clearTimeout(timer);
  }, [doc]);

  const handleGetPresignedUrl = async (runId: string) => {
    setIsLoading(true);
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "");
    baseUrl.pathname = "/functions/v1/backend/gen/poll";
    baseUrl.searchParams.append("userId", userId || "");
    baseUrl.searchParams.append("runId", runId || "");
    try {
      const req = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });
      const res = await req.json();
      setIsLoading(false);
      return res.signedUrl;
    } catch (err) {
      setIsLoading(false);
      console.error(err);
      return "";
    }
  };

  const handleGetDownloadLink = async () => {
    const presignedUrl = await handleGetPresignedUrl(doc?.run_id || "");

    // create a tag and click it
    const mdReq = await fetch(presignedUrl);
    const md = await mdReq.text();

    const htmlString = await marked(md);
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

    // const a = window.document.createElement("a");
    // a.href = url;
    // a.download = doc?.file_name || "";
    // a.click();
  };

  return (
    <Card>
      <CardHeader>
        <Progress value={progress} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-[2] font-semibold text-xl">{doc?.title}</div>

          <div className="flex items-center gap-2">
            <div className="p-2 flex-1 bg-slate-100 rounded-full flex gap-1 items-center font-semibold text-sm">
              {doc.status !== "completed" ? <Spinner /> : null}
              {doc.status?.toUpperCase() || "UNKNOWN"}
            </div>

            <Button
              className="flex items-center gap-1"
              onClick={() => handleGetDownloadLink()}
              disabled={doc?.status !== "completed" || isLoading}
            >
              Download
              {isLoading && <Spinner />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Job;
