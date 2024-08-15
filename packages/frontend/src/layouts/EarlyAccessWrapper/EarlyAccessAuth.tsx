import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PassThrough } from "stream";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "lucide-react";
import { useState } from "react";

const EAAuthSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(6),
});

const EarlyAccessAuth = () => {
  const [revealPassword, setRevealPassword] = useState(false);

  const form = useForm<z.infer<typeof EAAuthSchema>>({
    resolver: zodResolver(EAAuthSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof EAAuthSchema>) => {
    console.log(values);
  };

  return (
    <div className="w-screen h-screen grid place-items-center">
      <Card className="w-[32rem]">
        <CardHeader>
          <CardTitle>ThinkForce Early Access</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            This is an early access version for investors/partners to try out
            our knowledge fusion system. Users will have $1 to test the system.
            Please use the provided credentials to get started. Enjoy! 🚀
          </CardDescription>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full mt-6"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="w-full relative">
                        <Input
                          placeholder="Password"
                          {...field}
                          type={revealPassword ? "text" : "password"}
                        />
                        <EyeIcon
                          className="absolute w-4 h-4 opacity-75 top-1/2 right-3 -translate-y-1/2 cursor-pointer hover:scale-110"
                          onClick={() => {
                            setRevealPassword((prev) => !prev);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-3 select-none">
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarlyAccessAuth;
