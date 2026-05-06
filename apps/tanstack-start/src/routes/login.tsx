import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "signup" && !name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
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
        setError(response.error.message ?? "Authentication failed.");
        return;
      }

      await navigate({ to: "/", replace: true });
    } catch (err) {
      console.error("Authentication request failed", err);
      setError("Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-950">
      <section className="hidden w-1/2 flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_30%),linear-gradient(135deg,#020617,#0f172a_55%,#1e293b)] p-12 text-white lg:flex">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-sky-200 uppercase">
            Fitz Industries
          </p>
          <h1 className="mt-4 text-3xl font-bold">Support Platform</h1>
        </div>

        <div className="max-w-lg space-y-6">
          <h2 className="text-5xl leading-tight font-bold tracking-tight">
            Customer support built for multi-tenant teams.
          </h2>
          <p className="text-lg leading-8 text-slate-300">
            Manage conversations, customers, tickets, and organization settings
            from a single workspace.
          </p>
        </div>

        <p className="text-sm text-slate-400">
          Local baseline: layout and form state only.
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
              Fitz Industries
            </p>
            <h1 className="mt-2 text-2xl font-bold">Support Platform</h1>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                {mode === "signin" ? "Sign in" : "Sign up"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use your account credentials to access the support workspace.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === "signup" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    placeholder="Jane Smith"
                  />
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  placeholder="••••••••"
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              {mode === "signin" ? (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-semibold text-sky-700 hover:text-sky-800"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="font-semibold text-sky-700 hover:text-sky-800"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
