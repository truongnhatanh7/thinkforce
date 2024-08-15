import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EarlyAccessAuthProps {
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
}

const EAAuthSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(6),
});

const EarlyAccessAuth: React.FC<EarlyAccessAuthProps> = ({ setIsAuth }) => {
  const { toast } = useToast();
  const [revealPassword, setRevealPassword] = useState(false);

  const form = useForm<z.infer<typeof EAAuthSchema>>({
    resolver: zodResolver(EAAuthSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof EAAuthSchema>) => {
    signInWithEmail(values.username, values.password);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error(error);
      toast({
        title: "Invalid credentials",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }

    if (data.session) {
      setIsAuth(true);
    }
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
