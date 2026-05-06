import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  return <div className="p-8 text-slate-950">Tickets route is rendering</div>;
}
