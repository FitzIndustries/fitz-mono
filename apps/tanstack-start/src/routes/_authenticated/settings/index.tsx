import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsIndexPage,
});

function SettingsIndexPage() {
  return <p className="mt-4">Settings index route is rendering</p>;
}
