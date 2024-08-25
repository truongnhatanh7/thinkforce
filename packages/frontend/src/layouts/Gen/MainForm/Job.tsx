import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/repo/database.types";
import React from "react";
import { useNavigate } from "react-router-dom";

export interface JobProps {
  doc: Tables<"doc_meta">;
}

const Job: React.FC<JobProps> = ({ doc }) => {
  const navigate = useNavigate();

  const handleNavigateToDocViewer = () => {
    navigate("/viewer/" + encodeURIComponent(doc?.file_name));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-[2] font-semibold text-xl">{doc?.title}</div>

          <div className="flex items-center gap-2">
            <div className="p-2 flex-1 bg-slate-100 rounded-full flex gap-1 items-center font-semibold text-sm">
              COMPLETED
            </div>

            <Button
              className="flex items-center gap-1"
              onClick={() => handleNavigateToDocViewer()}
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
