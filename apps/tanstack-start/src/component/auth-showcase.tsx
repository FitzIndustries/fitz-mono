import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@fitzindustries/ui/button";
import { Input } from "@fitzindustries/ui/input";

import { authClient } from "~/auth/client";

export function AuthShowcase() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateSignIn = (value: {
    email: string;
    password: string;
  }): string | null => {
    if (!value.email.trim()) {
      return "Email is required.";
    }

    if (!value.password.trim()) {
      return "Password is required.";
    }

    return null;
  };

  const validateSignUp = (value: {
    name: string;
    email: string;
    password: string;
  }): string | null => {
    if (!value.name.trim()) {
      return "Name is required.";
    }

    return validateSignIn({ email: value.email, password: value.password });
  };

  const handleSignIn = async () => {
    const validationMessage = validateSignIn({ email, password });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/",
      });

      if (response.error) {
        setErrorMessage(response.error.message ?? "Unable to sign in.");
      }
    } catch (error) {
      console.error("Sign in failed", error);
      setErrorMessage("Unable to sign in right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    const validationMessage = validateSignUp({ name, email, password });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
        callbackURL: "/",
      });

      if (response.error) {
        setErrorMessage(response.error.message ?? "Unable to sign up.");
      }
    } catch (error) {
      console.error("Sign up failed", error);
      setErrorMessage("Unable to sign up right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name"
        />
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
        />
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="current-password"
        />
        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={handleSignIn} disabled={isSubmitting}>
            Sign in with Email
          </Button>
          <Button size="lg" onClick={handleSignUp} disabled={isSubmitting}>
            Create account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <Button
        size="lg"
        onClick={async () => {
          await authClient.signOut();
          await navigate({ href: "/", replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
