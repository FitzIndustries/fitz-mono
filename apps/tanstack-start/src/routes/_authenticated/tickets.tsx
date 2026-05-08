import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const isZeroReady = useIsZeroReady();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Tickets
        </p>
        <h1 className="mt-4 text-3xl font-bold">Ticket queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Current organization tickets, loaded through Zero.
        </p>
      </div>

      {isZeroReady ? (
        <TicketList />
      ) : (
        <p className="mt-8 text-sm text-slate-500">Loading tickets...</p>
      )}
    </section>
  );
}

function TicketList() {
  const [tickets] = useZeroQuery(queries.support.tickets());

  if (tickets.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold">No tickets yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tickets will appear here when customer issues are created.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr] bg-slate-50 px-4 py-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
        <span>Type</span>
        <span>Priority</span>
        <span>Status</span>
        <span>Customer</span>
      </div>
      <div className="divide-y divide-slate-200">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr] items-center px-4 py-4 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-950">
                {formatLabel(ticket.ticketType)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{ticket.id}</p>
            </div>
            <p className="text-slate-600">{formatLabel(ticket.priority)}</p>
            <p className="font-semibold text-slate-950">
              {formatLabel(ticket.status)}
            </p>
            <div className="text-slate-600">
              <p>{ticket.conversation?.customer?.name ?? "Unnamed customer"}</p>
              <p className="mt-1 text-xs">
                {ticket.conversation?.customer?.email ?? "No email"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
