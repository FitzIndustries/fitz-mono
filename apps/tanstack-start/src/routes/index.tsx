import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fitzindustries/ui";
import {
  ConversationListItem,
  ConversationView,
} from "@fitzindustries/ui/support";
import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";
import { useViewerOrganization } from "~/hooks/use-viewer-organization";
import { apiFetch } from "~/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: SupportPage,
});

type InboxType = "my" | "team";
type FilterType = "all" | "open" | "pending" | "resolved" | "closed";

function SupportPage() {
  const zero = useZero();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const {
    currentMembershipId,
    currentOrganization,
    currentOrganizationId,
    isPending: isOrganizationPending,
    organizations,
    setCurrentOrganization,
  } = useViewerOrganization();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inboxType, setInboxType] = useState<InboxType>("my");
  const [filter, setFilter] = useState<FilterType>("all");
  const [ticketType, setTicketType] = useState<
    "booking" | "refund" | "info" | "complaint" | "other"
  >("booking");
  const [ticketPriority, setTicketPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");

  const [conversations] = useZeroQuery(
    queries.support.inbox({
      scope: inboxType,
      status: filter === "all" ? undefined : filter,
    }),
  );

  const conversationList = useMemo(() => conversations, [conversations]);
  const activeSelectedId = useMemo(() => {
    if (!conversationList.length) {
      return null;
    }

    if (selectedId) {
      const isStillVisible = conversationList.some(
        (conversation) => conversation.id === selectedId,
      );

      if (isStillVisible) {
        return selectedId;
      }
    }

    return conversationList[0]?.id ?? null;
  }, [conversationList, selectedId]);

  const [selectedConversation] = useZeroQuery(
    queries.support.conversation(
      activeSelectedId ?? "00000000-0000-0000-0000-000000000000",
    ),
  );

  const userInitials = getInitials(session?.user.name);

  const selectedConversationProps = useMemo(() => {
    if (!selectedConversation?.customer) {
      return null;
    }

    return {
      id: selectedConversation.id,
      channel: selectedConversation.channel,
      status: selectedConversation.status ?? "open",
      subject: selectedConversation.subject,
      customer: {
        id: selectedConversation.customer.id,
        name: selectedConversation.customer.name,
        email: selectedConversation.customer.email,
        phone: selectedConversation.customer.phone,
        metadata: selectedConversation.customer.metadata ?? undefined,
      },
      agentName:
        selectedConversation.assignedAgentId === currentMembershipId
          ? "You"
          : selectedConversation.assignedAgentId
            ? "Assigned"
            : null,
      messages: selectedConversation.messages.map((message) => ({
        id: message.id,
        content: message.content,
        senderType: message.senderType,
        direction: message.direction,
        createdAt: message.createdAt ?? selectedConversation.lastMessageAt ?? 0,
        senderId: message.senderId,
        senderName:
          message.senderType === "customer"
            ? (selectedConversation.customer?.name ?? "Customer")
            : message.senderId === currentMembershipId
              ? "You"
              : message.senderType === "agent"
                ? "Agent"
                : message.senderType,
      })),
    };
  }, [currentMembershipId, selectedConversation]);

  const replyMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeSelectedId) {
        throw new Error("No conversation selected");
      }

      return apiFetch<{ message: { id: string } }>(
        `/api/conversations/${activeSelectedId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      );
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: () => {
      if (!activeSelectedId) {
        throw new Error("No conversation selected");
      }

      return apiFetch<{ ticket: { id: string }; duplicate?: boolean }>(
        "/api/tickets",
        {
          method: "POST",
          body: JSON.stringify({
            conversationId: activeSelectedId,
            ticketType,
            priority: ticketPriority,
          }),
        },
      );
    },
  });

  const handleSendMessage = (content: string) => {
    if (!activeSelectedId) {
      return;
    }

    void replyMutation.mutateAsync(content).catch((error) => {
      console.error("Failed to send support message", error);
    });
  };

  const handleStatusChange = (
    status: "open" | "pending" | "resolved" | "closed",
  ) => {
    if (!selectedId) {
      return;
    }

    void zero
      .mutate(
        mutators.support.updateStatus({ conversationId: selectedId, status }),
      )
      .server.catch((error) => {
        console.error("Failed to update conversation status", error);
      });
  };

  const handleAssignSelf = () => {
    if (!selectedId) {
      return;
    }

    void zero
      .mutate(mutators.support.assignSelf({ conversationId: selectedId }))
      .server.catch((error) => {
        console.error("Failed to assign conversation", error);
      });
  };

  const ticketActions = selectedConversationProps ? (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs">
        {selectedConversation?.tickets.length
          ? `${selectedConversation.tickets.length} ticket${selectedConversation.tickets.length === 1 ? "" : "s"}`
          : "No tickets"}
      </span>
      <Select
        value={ticketType}
        onValueChange={(
          value: "booking" | "refund" | "info" | "complaint" | "other",
        ) => {
          setTicketType(value);
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="booking">Booking</SelectItem>
          <SelectItem value="refund">Refund</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="complaint">Complaint</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={ticketPriority}
        onValueChange={(value: "low" | "medium" | "high" | "urgent") => {
          setTicketPriority(value);
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          void createTicketMutation.mutateAsync().catch((error) => {
            console.error("Failed to create ticket", error);
          });
        }}
        disabled={createTicketMutation.isPending}
      >
        {createTicketMutation.isPending ? "Creating..." : "Create ticket"}
      </Button>
    </div>
  ) : null;

  const isLoading =
    isSessionPending || isOrganizationPending || !currentOrganizationId;

  return (
    <div className="flex h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.12),_transparent_30%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
      <aside className="bg-card/90 flex w-80 shrink-0 flex-col border-r backdrop-blur">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Support Desk
              </p>
              <h1 className="text-lg font-semibold">
                {currentOrganization?.name ?? "Workspace"}
              </h1>
            </div>
          </div>

          <div className="mt-3">
            <Select
              value={currentOrganizationId ?? undefined}
              onValueChange={(value: string) => {
                void setCurrentOrganization.mutateAsync(value);
              }}
              disabled={
                setCurrentOrganization.isPending || !organizations.length
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((item) => (
                  <SelectItem
                    key={item.organizationId}
                    value={item.organizationId}
                  >
                    {item.organization?.name ?? "Workspace"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-medium">
            <Link to="/" className="bg-muted rounded-md px-3 py-2 text-center">
              Inbox
            </Link>
            <Link
              to="/customers"
              className="hover:bg-muted rounded-md px-3 py-2 text-center"
            >
              Customers
            </Link>
            <Link
              to="/tickets"
              className="hover:bg-muted rounded-md px-3 py-2 text-center"
            >
              Tickets
            </Link>
          </div>

          <div className="bg-muted mt-4 flex gap-1 rounded-lg p-1">
            <TabButton
              active={inboxType === "my"}
              onClick={() => setInboxType("my")}
            >
              My Inbox
            </TabButton>
            <TabButton
              active={inboxType === "team"}
              onClick={() => setInboxType("team")}
            >
              Team Inbox
            </TabButton>
          </div>

          <div className="bg-muted mt-2 grid grid-cols-5 gap-1 rounded-lg p-1">
            {(["all", "open", "pending", "resolved", "closed"] as const).map(
              (value) => (
                <TabButton
                  key={value}
                  active={filter === value}
                  onClick={() => setFilter(value)}
                  className="px-2"
                >
                  {value === "all" ? "All" : capitalize(value)}
                </TabButton>
              ),
            )}
          </div>

          <p className="text-muted-foreground mt-3 text-xs">
            {isLoading
              ? "Loading conversations..."
              : `${conversationList.length} conversation${conversationList.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <LoadingList />
          ) : conversationList.length ? (
            <div className="space-y-2">
              {conversationList.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  id={conversation.id}
                  customer={{
                    name: conversation.customer?.name,
                    email: conversation.customer?.email,
                    phone: conversation.customer?.phone,
                  }}
                  channel={conversation.channel}
                  status={conversation.status ?? "open"}
                  subject={conversation.subject}
                  lastMessage={
                    conversation.messages[0]
                      ? {
                          content: conversation.messages[0].content,
                          createdAt:
                            conversation.messages[0].createdAt ??
                            conversation.lastMessageAt ??
                            0,
                        }
                      : undefined
                  }
                  assignedAgent={
                    conversation.assignedAgentId
                      ? {
                          name:
                            conversation.assignedAgentId === currentMembershipId
                              ? "You"
                              : "Assigned",
                        }
                      : null
                  }
                  isSelected={activeSelectedId === conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyInbox />
          )}
        </div>

        <div className="border-t p-2">
          <Link
            to="/settings"
            className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <div className="from-primary to-primary/60 text-primary-foreground flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {session?.user.name ?? "Agent"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {session?.user.email ?? ""}
              </p>
            </div>
            <Settings className="text-muted-foreground size-4" />
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {selectedConversationProps ? (
          <ConversationView
            {...selectedConversationProps}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            onAssign={handleAssignSelf}
            actions={ticketActions}
            disabled={replyMutation.isPending}
            className="bg-background/80 h-full backdrop-blur"
          />
        ) : (
          <EmptyConversation />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-background shadow-sm" : "hover:bg-background/60",
        className,
      )}
    >
      {children}
    </button>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="bg-muted/70 h-24 animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-sm">
      Your inbox is clear. New WhatsApp and email conversations will appear
      here.
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="bg-muted mx-auto flex size-16 items-center justify-center rounded-full" />
        <h2 className="mt-4 text-lg font-semibold">No conversation selected</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Pick a conversation from the inbox to review the customer history and
          reply in real time.
        </p>
      </div>
    </div>
  );
}

function getInitials(name?: string | null) {
  if (!name) {
    return "?";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function capitalize(value: string) {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}
