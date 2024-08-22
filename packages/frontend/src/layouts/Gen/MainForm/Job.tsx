import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tables } from "@/repo/database.types";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface JobProps {
  doc: Tables<"doc_meta">;
}

const Job: React.FC<JobProps> = ({ doc }) => {
  const [progress, setProgress] = React.useState(0);
  const navigate = useNavigate();

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

  const handleNavigateToDocViewer = () => {
    navigate("/viewer/" + encodeURIComponent(doc?.file_name));
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
              onClick={() => handleNavigateToDocViewer()}
              disabled={doc?.status !== "completed"}
            >
              Open
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Job;
