import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@fitzindustries/ui/components/button";
import { Input } from "@fitzindustries/ui/components/input";
import { Label } from "@fitzindustries/ui/components/label";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }

    void navigate({ to: "/", replace: true });
  }, [navigate, session]);

  if (isSessionPending) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <p className="text-sm">Loading login...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup" && !name.trim()) {
        setError("Name is required");
        return;
      }

      const response =
        mode === "signin"
          ? await authClient.signIn.email({
              email: email.trim(),
              password,
              callbackURL: "/",
            })
          : await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
              callbackURL: "/",
            });

      if (response.error) {
        setError(response.error.message ?? "Authentication failed");
      } else {
        await navigate({ to: "/", replace: true });
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="bg-primary text-primary-foreground hidden flex-col justify-between p-12 lg:flex lg:w-1/2">
        <div>
          <h1 className="text-3xl font-bold">Summer Music Festival</h1>
          <p className="text-primary-foreground/80 mt-2">Support Platform</p>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl leading-tight font-bold">
            Customer support built for events
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Handle ticket issues, refunds, and customer inquiries all in one
            place.
          </p>
        </div>
        <p className="text-primary-foreground/60 text-sm">
          © 2026 Summer Music Festival. All rights reserved.
        </p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "signin"
                ? "Sign in to access your support dashboard"
                : "Get started with your support account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={8}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <div className="text-center text-sm">
            {mode === "signin" ? (
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
