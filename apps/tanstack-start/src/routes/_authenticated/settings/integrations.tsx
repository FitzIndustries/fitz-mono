import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return <SettingsPlaceholder title="Integrations" />;
}

function SettingsPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This settings section is ready to restore next.
      </p>
    </div>
  );
}
