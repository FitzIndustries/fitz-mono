import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return <p className="mt-4">Integrations route is rendering</p>;
}
