import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod/v4";

import type { Session } from "@fitzindustries/auth";

import { authClient } from "~/auth/client";
import { getAuthSession } from "~/lib/auth-session";
import { makeTRPCClient } from "~/lib/trpc";

const inviteSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/accept-invite")({
  validateSearch: inviteSearchSchema,
  component: AcceptInvitePage,
});

interface InvitePreview {
  email: string;
  role: "admin" | "agent" | "viewer";
  expiresAt: Date;
  organizationName: string;
  organizationSlug: string;
}

function AcceptInvitePage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      if (!token) {
        setError("Invite token is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const trpc = makeTRPCClient();
        const [preview, currentSession] = await Promise.all([
          trpc.teamInvites.preview.query({ token }),
          getAuthSession(),
        ]);

        if (!isMounted) {
          return;
        }

        if (!preview.invite) {
          setError(
            "This invite is invalid, expired, or has already been used.",
          );
          setIsLoading(false);
          return;
        }

        setInvite(preview.invite);
        setEmail(preview.invite.email);
        setSession(currentSession);
      } catch (caughtError) {
        if (isMounted) {
          console.error("Invite preview failed", caughtError);
          setError("Unable to load invite. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInvite();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function acceptInvite() {
    if (!token || !invite) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const trpc = makeTRPCClient();
      const result = await trpc.teamInvites.accept.mutate({ token });
      const org = result.organizationSlug ?? invite.organizationSlug;

      await navigate({ to: "/", search: { org }, replace: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to accept invite",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!invite) {
      setError("Invite is not ready yet.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Name is required.");
      return;
    }

    if (email.trim().toLowerCase() !== invite.email) {
      setError("Use the email address this invite was sent to.");
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
              email: invite.email,
              password,
              callbackURL: `/accept-invite?token=${token ?? ""}`,
            })
          : await authClient.signUp.email({
              name: name.trim(),
              email: invite.email,
              password,
              callbackURL: `/accept-invite?token=${token ?? ""}`,
            });

      if (response.error) {
        setError(response.error.message ?? "Authentication failed.");
        return;
      }

      await acceptInvite();
    } catch (caughtError) {
      console.error("Invite authentication failed", caughtError);
      setError("Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function switchAccount() {
    setError(null);
    setIsSubmitting(true);

    try {
      await authClient.signOut();
      setSession(null);
      setPassword("");
      setMode("signin");
      setEmail(invite?.email ?? "");
    } catch (caughtError) {
      console.error("Invite sign-out failed", caughtError);
      setError("Unable to sign out. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isWrongAccount =
    !!invite &&
    !!session?.user.email &&
    session.user.email.toLowerCase() !== invite.email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-950">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-950/30">
        <p className="text-sm font-semibold tracking-[0.22em] text-slate-500 uppercase">
          Fitz Industries
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Accept your invite
        </h1>

        {isLoading ? (
          <p className="mt-6 text-sm text-slate-600">Loading invite...</p>
        ) : null}

        {!isLoading && invite ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">You have been invited to</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {invite.organizationName}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Role: <span className="font-semibold">{invite.role}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Email: <span className="font-semibold">{invite.email}</span>
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!isLoading && invite && session ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              Signed in as {session.user.email}.
              {isWrongAccount
                ? " Switch accounts to accept this invite."
                : " Accept this invite to join the organization."}
            </p>
            {isWrongAccount ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void switchAccount()}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting
                  ? "Signing out..."
                  : "Sign out and switch account"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void acceptInvite()}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Accepting..." : "Accept invite"}
              </button>
            )}
          </div>
        ) : null}

        {!isLoading && invite && !session ? (
          <form className="mt-6 space-y-4" onSubmit={handleAuthSubmit}>
            {mode === "signup" ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm transition outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm transition outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm transition outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in and accept"
                  : "Create account and accept"}
            </button>

            <p className="text-center text-sm text-slate-600">
              {mode === "signin" ? "Need an account?" : "Already have one?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-sky-700 hover:text-sky-800"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
        ) : null}
      </section>
    </main>
  );
}
