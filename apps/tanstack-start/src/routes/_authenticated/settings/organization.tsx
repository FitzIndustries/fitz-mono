import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrganizationPage,
});

function OrganizationPage() {
  return <p className="mt-4">Organization route is rendering</p>;
}
