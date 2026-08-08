import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { makeTRPCClient } from "~/lib/trpc";
import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  component: TicketDetailPage,
});

function TicketDetailPage() {
  const isZeroReady = useIsZeroReady();
  const { ticketId } = Route.useParams();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading ticket...</p>;
  }

  return <TicketDetail ticketId={ticketId} />;
}

function TicketDetail({ ticketId }: { ticketId: string }) {
  const [tickets] = useZeroQuery(queries.support.tickets());
  const ticket = tickets.find((item) => item.id === ticketId);

  if (!ticket) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          to="/tickets"
          className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
        >
          Back to tickets
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Ticket not found</h1>
      </section>
    );
  }

  if (!ticket.conversationId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          to="/tickets"
          className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
        >
          Back to tickets
        </Link>
        <h1 className="mt-6 text-2xl font-bold">No conversation linked</h1>
      </section>
    );
  }

  return <ConversationView ticket={ticket} />;
}

function ConversationView({
  ticket,
}: {
  ticket: {
    id: string;
    conversationId: string;
    priority: string | null | undefined;
    status: TicketStatus | null | undefined;
    ticketType: string;
  };
}) {
  const zero = useZero();
  const conversationId = ticket.conversationId;
  const [conversation] = useZeroQuery(
    queries.support.conversation(conversationId),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!conversation) {
    return <p className="text-sm text-slate-500">Loading conversation...</p>;
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const content = message.trim();
    if (!content) {
      return;
    }

    setIsSending(true);

    try {
      const trpc = makeTRPCClient();
      await trpc.support.sendReply.mutate({ conversationId, content });
      setMessage("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send message",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function assignToSelf() {
    setError(null);
    setIsAssigning(true);

    try {
      const write = zero.mutate(
        mutators.support.assignSelf({ conversationId }),
      );
      const result = await write.client;

      if (result.type === "error") {
        setError(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to assign ticket",
      );
    } finally {
      setIsAssigning(false);
    }
  }

  async function updateTicketStatus(status: TicketStatus) {
    setError(null);
    setIsUpdatingStatus(true);

    try {
      const write = zero.mutate(
        mutators.support.updateTicketStatus({ ticketId: ticket.id, status }),
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
      setIsUpdatingStatus(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <Link
        to="/tickets"
        className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
      >
        Back to tickets
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Conversation
        </p>
        <h1 className="mt-4 text-3xl font-bold">
          {conversation.customer?.name ?? "Unnamed customer"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {conversation.customer?.email ?? "No email"}
        </p>
      </div>

      <div className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-4">
        <DetailCard label="Ticket" value={formatLabel(ticket.ticketType)} />
        <DetailCard label="Priority" value={formatLabel(ticket.priority)} />
        <label className="block space-y-2">
          <span className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Status
          </span>
          <select
            value={ticket.status ?? "open"}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              void updateTicketStatus(event.target.value as TicketStatus)
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {ticketStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            Assigned
          </p>
          <p className="text-sm font-semibold break-words text-slate-950">
            {conversation.assignedAgent?.userId ?? "Unassigned"}
          </p>
          <button
            type="button"
            disabled={isAssigning}
            onClick={() => void assignToSelf()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            {isAssigning ? "Assigning..." : "Assign to me"}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {conversation.messages.length > 0 ? (
          conversation.messages.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500 uppercase">
                <span>{item.senderType}</span>
                <span>{formatTimestamp(item.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-800">
                {item.content}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No messages yet.
          </p>
        )}
      </div>

      <form onSubmit={(event) => void handleSend(event)} className="mt-8">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Reply</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSending}
          className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSending ? "Sending..." : "Send reply"}
        </button>
      </form>
    </section>
  );
}

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

const ticketStatuses: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
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

function formatTimestamp(value: number | null | undefined) {
  if (!value) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
