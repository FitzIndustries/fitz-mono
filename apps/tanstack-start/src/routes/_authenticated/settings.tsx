import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Settings
        </p>
        <h1 className="mt-4 text-3xl font-bold">Workspace settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Manage organization details, team access, support channels, billing,
          and integrations.
        </p>
      </div>

      <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        <SettingsLink to="/settings">Overview</SettingsLink>
        <SettingsLink to="/settings/organization">Organization</SettingsLink>
        <SettingsLink to="/settings/team">Team</SettingsLink>
        <SettingsLink to="/settings/channels">Channels</SettingsLink>
        <SettingsLink to="/settings/billing">Billing</SettingsLink>
        <SettingsLink to="/settings/integrations">Integrations</SettingsLink>
      </nav>

      <div className="pt-6">
        <Outlet />
      </div>
    </section>
  );
}

function SettingsLink({
  children,
  to,
}: {
  children: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      activeProps={{
        className: "bg-slate-950 text-white hover:bg-slate-950",
      }}
      inactiveProps={{
        className: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      }}
      className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition"
    >
      {children}
    </Link>
  );
}
