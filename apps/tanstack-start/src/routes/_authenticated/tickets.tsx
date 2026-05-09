import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

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
  const zero = useZero();
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200">
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
              <TicketStatusSelect
                disabled={savingTicketId === ticket.id}
                status={ticket.status ?? "open"}
                onChange={(status) =>
                  void updateTicketStatus({ ticketId: ticket.id, status })
                }
              />
              <div className="text-slate-600">
                <p>
                  {ticket.conversation?.customer?.name ?? "Unnamed customer"}
                </p>
                <p className="mt-1 text-xs">
                  {ticket.conversation?.customer?.email ?? "No email"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  async function updateTicketStatus({
    status,
    ticketId,
  }: {
    status: TicketStatus;
    ticketId: string;
  }) {
    setError(null);
    setSavingTicketId(ticketId);

    try {
      const write = zero.mutate(
        mutators.support.updateTicketStatus({ status, ticketId }),
      );
      const result = await write.client;

      if (result.type === "error") {
        setError(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update ticket status",
      );
    } finally {
      setSavingTicketId(null);
    }
  }
}

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

const ticketStatuses: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

function TicketStatusSelect({
  disabled,
  onChange,
  status,
}: {
  disabled: boolean;
  onChange: (status: TicketStatus) => void;
  status: TicketStatus;
}) {
  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as TicketStatus)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    >
      {ticketStatuses.map((ticketStatus) => (
        <option key={ticketStatus} value={ticketStatus}>
          {formatLabel(ticketStatus)}
        </option>
      ))}
    </select>
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
