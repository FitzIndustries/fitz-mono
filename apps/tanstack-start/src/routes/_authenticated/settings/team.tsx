import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/team")({
  component: TeamPage,
});

function TeamPage() {
  return <p className="mt-4">Team route is rendering</p>;
}
