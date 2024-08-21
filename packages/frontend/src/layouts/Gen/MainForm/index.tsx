import { useTokensQuery } from "@/api/useGenUsageQuery";
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
import { Tables } from "@/repo/database.types";
import { handleGetLatestDoc } from "@/repo/docMeta";
import { supabase } from "@/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Job from "./Job";
import { useQueryClient } from "@tanstack/react-query";

interface MainFormProps {}

const GenSchema = z.object({
  topic: z.string().min(10, {
    message: "Topic must be specific",
  }),
});

const MainForm: React.FC<MainFormProps> = ({}) => {
  const form = useForm<z.infer<typeof GenSchema>>({
    resolver: zodResolver(GenSchema),
    defaultValues: {
      topic: "",
    },
  });
  const [doc, setDoc] = useState<Tables<"doc_meta">>();
  const [needRefetch, setNeedRefetch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tokens = useTokensQuery();
  const intervalRef = useRef<number>();
  const queryClient = useQueryClient();

  useEffect(() => {}, []);
  const onSubmit = (values: z.infer<typeof GenSchema>) => {
    handleSubmitGenRequest(values.topic);
  };

  const handleSubmitGenRequest = async (topic: string) => {
    setNeedRefetch(!needRefetch);
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
      await fetch(`${baseUrl}/functions/v1/backend/gen/emit`, {
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

      queryClient.removeQueries({
        queryKey: ["get-doc", doc?.file_name],
      });
      setDoc(undefined);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleGetDoc = async (): Promise<Tables<"doc_meta"> | undefined> => {
    const docRes = await handleGetLatestDoc();
    if (docRes) {
      setDoc(docRes);
      return docRes;
    }

    return undefined;
  };

  useEffect(() => {
    // handle ongoing job
    setIsLoading(true);
    intervalRef.current = window.setInterval(async () => {
      const res = await handleGetDoc();
      if (res?.status === "completed") {
        await queryClient.invalidateQueries({
          queryKey: ["list-docs"],
        });
        clearInterval(intervalRef.current);
      }
      setIsLoading(false);
    }, 3000);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [needRefetch]);

  return (
    <Card className="rounded-none w-full h-screen">
      <CardHeader>
        <CardTitle>ThinkForce (Private Early Access v0.0.1)</CardTitle>
        <CardDescription>
          ThinkForce replicate the process of a human researcher, hence, once
          you pressed the "Generate" button, it will take some time to process
          the information <b>(5-8 minutes)</b>.
          <br />
          After that, you could download the generated content.
          <br />
          <br />
          <i>
            NOTE: This is an early access version - that means the final product
            is not finalised yet, hence, the system could create mistakes.
            Please double check the generated content.
          </i>
          <br />
        </CardDescription>
        <p className="py-2 px-3 rounded-md font-medium text-sm bg-slate-500 w-fit text-white">
          Your token balance: {tokens.data || 0}
        </p>
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
                  Generate <Spinner />
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
          <CardTitle className="">Current jobs</CardTitle>
        </div>
        <div className="mt-3">
          {isLoading && <Spinner />}
          {isLoading ? null : doc && <Job doc={doc} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default MainForm;
