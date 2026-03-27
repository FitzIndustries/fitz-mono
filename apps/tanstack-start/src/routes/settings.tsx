"use client";

import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  MessageSquare,
  Puzzle,
  Settings,
  Users,
} from "lucide-react";

import { ThemeToggle } from "@fitzindustries/ui/theme";

import { authClient } from "~/auth/client";
import { useViewerOrganization } from "~/hooks/use-viewer-organization";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: SettingsLayout,
});

const settingsNavItems = [
  { title: "Profile", icon: Settings, href: "/settings" },
  { title: "Organization", icon: Building2, href: "/settings/organization" },
  { title: "Channels", icon: MessageSquare, href: "/settings/channels" },
  { title: "Team", icon: Users, href: "/settings/team" },
  { title: "Billing", icon: CreditCard, href: "/settings/billing" },
  { title: "Integrations", icon: Puzzle, href: "/settings/integrations" },
];

function SettingsLayout() {
  const { currentOrganizationId, organizations, setCurrentOrganization } =
    useViewerOrganization();

  return (
    <div className="flex h-screen">
      <aside className="bg-card flex w-64 flex-col border-r">
        <div className="space-y-1 border-b p-4">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Inbox
          </Link>
        </div>
        <div className="flex items-center justify-between border-b px-4 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Settings</h2>
            <select
              value={currentOrganizationId ?? ""}
              onChange={(event) => {
                void setCurrentOrganization.mutateAsync(event.target.value);
              }}
              className="border-input bg-background mt-2 h-9 w-full rounded-md border px-2 text-sm"
              disabled={
                setCurrentOrganization.isPending || !organizations.length
              }
            >
              {organizations.map((item) => (
                <option key={item.organizationId} value={item.organizationId}>
                  {item.organization?.name ?? "Workspace"}
                </option>
              ))}
            </select>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {settingsNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
