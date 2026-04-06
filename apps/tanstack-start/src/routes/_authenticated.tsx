import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { Toaster } from "@fitzindustries/ui/components/sonner";

import { authClient } from "~/auth/client";
import { Providers } from "~/providers";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }

    return {
      session: session.data,
      userId: session.data.user.id,
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <Providers>
      <Outlet />
      <Toaster />
    </Providers>
  );
}
