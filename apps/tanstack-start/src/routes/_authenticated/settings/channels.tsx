import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  return <p className="mt-4">Channels route is rendering</p>;
}
