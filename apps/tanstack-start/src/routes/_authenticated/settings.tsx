import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <main className="min-h-screen bg-white p-8 text-slate-950">
      <h1 className="text-2xl font-bold">Settings layout is rendering</h1>
      <Outlet />
    </main>
  );
}
