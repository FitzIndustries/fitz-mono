import { createFileRoute, redirect } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/tickets")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: TicketsPage,
});

function TicketsPage() {
  const [tickets] = useZeroQuery(queries.support.tickets());

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Event-related cases created from conversations and escalations.
        </p>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <article
            key={ticket.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">
                {ticket.ticketType} for{" "}
                {ticket.conversation?.customer?.name ?? "Customer"}
              </p>
              <p className="text-muted-foreground text-sm">
                {ticket.status} · {ticket.priority} priority
              </p>
            </div>
            <div className="text-right text-sm">
              <p>{ticket.eventId ?? "No event linked"}</p>
              <p className="text-muted-foreground">
                Order {ticket.orderId ?? "-"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
