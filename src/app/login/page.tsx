"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Brand } from "@/components/brand";
import { ErrorAlert } from "@/components/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useMe } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

// Seed accounts from the brief, shown so reviewers can switch roles in one click.
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@example.com", password: "admin123" },
  { label: "Operator", email: "ops1@example.com", password: "ops123" },
  { label: "Client A", email: "client-a@example.com", password: "client123" },
  { label: "Client B", email: "client-b@example.com", password: "client123" },
];

export default function LoginPage() {
  const router = useRouter();
  const me = useMe();
  const login = useLogin();

  // Already signed in (valid token): go straight to the app.
  useEffect(() => {
    if (me.data) router.replace("/requests");
  }, [me.data, router]);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const submit = form.handleSubmit((values) => login.mutate(values));

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Use your work account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {login.error && <ErrorAlert error={login.error} title="Could not sign in" />}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                  {...form.register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
                {login.isPending && <Loader2Icon className="animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-2.5">
          <p className="text-center text-xs text-muted-foreground">Demo accounts click to fill</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset({ email: a.email, password: a.password });
                  login.reset();
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
