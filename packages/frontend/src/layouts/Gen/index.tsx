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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const GenSchema = z.object({
  topic: z.string().min(10, {
    message: "Topic must be specific",
  }),
});

const Gen = () => {
  const form = useForm<z.infer<typeof GenSchema>>({
    resolver: zodResolver(GenSchema),
    defaultValues: {
      topic: "",
    },
  });

  const onSubmit = (values: z.infer<typeof GenSchema>) => {
    console.log(values);
  };
  return (
    <div className="w-screen h-screen grid place-items-center">
      <div className="w-8/12">
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

                <Button type="submit" className="mt-4">
                  Generate
                </Button>
              </form>
            </Form>
            <div className="my-4">
              <Separator />
            </div>
            <CardTitle>Result</CardTitle>
            <CardDescription className="mt-3">
              Your result will be displayed here.
              <br />
              Please don't close the tab while the content is being generated.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Gen;
