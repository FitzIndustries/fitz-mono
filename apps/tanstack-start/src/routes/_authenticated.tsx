import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getAuthSession } from "~/lib/auth-session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getAuthSession();

    if (!session) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }

    return {
      session,
      userId: session.user.id,
    };
  },
  pendingComponent: AuthenticatedPending,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}

function AuthenticatedPending() {
  return <div className="min-h-screen bg-white" />;
}
