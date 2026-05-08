import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsIndexPage,
});

function SettingsIndexPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold">Settings overview</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Choose a settings section to continue restoring organization management.
      </p>
    </div>
  );
}
