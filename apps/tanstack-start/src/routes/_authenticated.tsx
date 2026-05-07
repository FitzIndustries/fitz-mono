import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";

import { authClient } from "~/auth/client";
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
  const navigate = useNavigate();
  const { session } = Route.useRouteContext();
  const userLabel = session.user.name || session.user.email;

  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-5 py-6 lg:block">
        <div>
          <p className="text-xs font-semibold tracking-[0.24em] text-slate-500 uppercase">
            Fitz Industries
          </p>
          <h1 className="mt-2 text-xl font-bold">Support Platform</h1>
        </div>

        <nav className="mt-8 space-y-1">
          <ShellLink to="/">Dashboard</ShellLink>
          <ShellLink to="/customers">Customers</ShellLink>
          <ShellLink to="/tickets">Tickets</ShellLink>
          <ShellLink to="/settings">Settings</ShellLink>
        </nav>

        <div className="absolute right-5 bottom-6 left-5">
          <p className="truncate text-sm font-medium text-slate-900">
            {userLabel}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {session.user.id}
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <header className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
              Fitz Industries
            </p>
            <h1 className="text-lg font-bold">Support Platform</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Sign out
          </button>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto">
          <ShellLink to="/">Dashboard</ShellLink>
          <ShellLink to="/customers">Customers</ShellLink>
          <ShellLink to="/tickets">Tickets</ShellLink>
          <ShellLink to="/settings">Settings</ShellLink>
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function ShellLink({ children, to }: { children: React.ReactNode; to: string }) {
  return (
    <Link
      to={to}
      activeProps={{
        className: "bg-slate-950 text-white hover:bg-slate-950",
      }}
      inactiveProps={{
        className: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      }}
      className="block rounded-lg px-3 py-2 text-sm font-semibold transition lg:w-full"
    >
      {children}
    </Link>
  );
}

function AuthenticatedPending() {
  return <div className="min-h-screen bg-white" />;
}
