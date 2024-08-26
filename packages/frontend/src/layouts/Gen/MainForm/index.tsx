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
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/repo/database.types";
import { handleGetLatestDoc } from "@/repo/docMeta";
import { supabase } from "@/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const tokens = useTokensQuery();
  const { toast } = useToast();
  const queryclient = useQueryClient();

  const onSubmit = (values: z.infer<typeof GenSchema>) => {
    handleSubmitGenRequest(values.topic);
  };

  const handleSubmitGenRequest = async (topic: string) => {
    if (tokens.data === 0) {
      toast({
        variant: "destructive",
        title: "Not enough token",
        description: "Please buy more tokens to continue",
      });

      return;
    }

    try {
      setIsLoading(true);
      // Call edge func
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const userId = session.data.session?.user.id;
      if (!accessToken) {
        throw new Error("Access token not found");
      }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      await fetch(`${baseUrl}/functions/v1/backend/v2/gen`, {
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

      const doc = await handleGetLatestDoc();

      if (!doc) {
        throw new Error("Doc not found");
      }

      await queryclient.invalidateQueries({
        queryKey: ["list-docs"],
      });

      setDoc(doc);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-none w-full h-screen">
      <CardHeader>
        <CardTitle>ThinkForce (Private Early Access v0.0.1)</CardTitle>
        <CardDescription>
          ThinkForce replicate the process of a human researcher, hence, once
          you pressed the "Generate" button, it will take some time to process
          the information <b>(around 1 minute)</b>.
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
          <CardTitle className="">Current generation</CardTitle>
        </div>
        <div className="mt-3">
          {isLoading && (
            <div className="flex gap-1 items-center">
              <Spinner />
              <span>Please wait...</span>
            </div>
          )}
          {isLoading ? null : doc && <Job doc={doc} />}
        </div>
      </CardContent>
    </Card>
  );
};

export default MainForm;
