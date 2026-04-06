import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authClient } from "~/auth/client";
import { AuthenticatedProviders } from "~/providers";

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
  pendingComponent: AuthenticatedPending,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AuthenticatedProviders>
      <Outlet />
    </AuthenticatedProviders>
  );
}

function AuthenticatedPending() {
  return <div className="bg-background min-h-screen" />;
}
