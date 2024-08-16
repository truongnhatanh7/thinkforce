import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Markdown from "react-markdown";
import { z } from "zod";

const GenSchema = z.object({
  topic: z.string().min(10, {
    message: "Topic must be specific",
  }),
});

const Gen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<number>();
  const [runId, setRunId] = useState("");
  const [mdResult, setMdResult] = useState("");
  const form = useForm<z.infer<typeof GenSchema>>({
    resolver: zodResolver(GenSchema),
    defaultValues: {
      topic: "",
    },
  });

  const onSubmit = (values: z.infer<typeof GenSchema>) => {
    handleSubmitGenRequest(values.topic);
  };

  const handleSubmitGenRequest = async (topic: string) => {
    setIsLoading(true);
    try {
      // Call edge func
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const userId = session.data.session?.user.id;
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const req = await fetch(`${baseUrl}/functions/v1/backend/gen/emit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: topic,
          userId: userId,
          outline: "",
        }),
      });
      const res = await req.json();
      console.log(topic, res);
      setRunId(res.id);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleCheckRunId = async (runId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const userId = session.data.session?.user.id || "";
      const baseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || "");
      baseUrl.pathname = "/functions/v1/backend/gen/poll";
      baseUrl.searchParams.set("runId", runId);
      baseUrl.searchParams.set("userId", userId);

      const req = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const res = await req.json();

      if (res.status !== "EXECUTING") {
        clearInterval(intervalRef.current);

        if (res.status === "COMPLETED") {
          // Set the preview
          setIsLoading(false);
          setMdResult(res.output.data.article || "");
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (runId) {
        console.log("Checking runId", runId);
        handleCheckRunId(runId);
      }
    }, 5000);
    intervalRef.current = interval;

    return () => clearInterval(interval);
  }, [runId]);

  return (
    <div className="w-screen h-screen grid place-items-center">
      <div className="w-8/12 py-6">
        <Card>
          <CardHeader>
            <CardTitle>ThinkForce (Private Early Access v0.0.1)</CardTitle>
            <CardDescription>
              ThinkForce replicate the process of a human researcher, hence,
              once you pressed the "Generate" button, it will take some time to
              process the information <b>(5-8 minutes)</b>.
              <br />
              After that, you could download the generated content.
              <br />
              <br />
              <i>
                NOTE: This is an early access version - that means the final
                product is not finalised yet, hence, the system could create
                mistakes. Please double check the generated content.
              </i>
            </CardDescription>
          </CardHeader>
          <CardContent className="">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="topic">Topic</FormLabel>
                      <Input
                        placeholder="Enter a specific topic. Example: 'Comparision between combustion engine and electric motor'"
                        {...field}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="mt-4" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex gap-2 items-center">
                      Generating <Spinner />
                    </div>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </form>
            </Form>
            <div className="my-4">
              <Separator />
            </div>
            <div className="flex justify-between items-center">
              <CardTitle className="">Result</CardTitle>
              {/* <Button
                variant="outline"
                onClick={() => {
                  getRawMDFile();
                }}
              >
                Download PDF
              </Button> */}
            </div>
            <div className="mt-3">
              {mdResult !== "" ? (
                <div>
                  <Markdown className="markdown">{mdResult}</Markdown>
                </div>
              ) : (
                <CardDescription className="">
                  Your result will be displayed here.
                  <br />
                  Please don't close the tab while the content is being
                  generated.
                </CardDescription>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Gen;
