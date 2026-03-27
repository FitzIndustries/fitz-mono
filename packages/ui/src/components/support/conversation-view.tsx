import { useEffect, useRef } from "react";
import { Mail, MessageCircle, MoreHorizontal, Phone, User } from "lucide-react";

import { cn } from "../../lib/utils";
import { ChannelBadge, StatusBadge } from "./badges";
import { ChatInput } from "./chat-input";
import { MessageBubble } from "./message-bubble";

interface Message {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderId?: string | null;
  senderName?: string | null;
  direction: "inbound" | "outbound";
  createdAt: Date | number;
}

interface Customer {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}

interface ConversationViewProps {
  id: string;
  channel: "email" | "whatsapp";
  status: "open" | "pending" | "resolved" | "closed";
  subject?: string | null;
  customer: Customer;
  messages: Message[];
  agentName?: string | null;
  onSendMessage: (content: string) => void;
  onStatusChange?: (status: "open" | "pending" | "resolved" | "closed") => void;
  onAssign?: () => void;
  actions?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function ConversationView({
  channel,
  status,
  subject,
  customer,
  messages,
  agentName,
  onSendMessage,
  onStatusChange,
  onAssign,
  actions,
  disabled,
  className,
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const customerInitials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (customer.email?.[0]?.toUpperCase() ?? "?");

  const customerDisplay =
    customer.name ?? customer.email ?? customer.phone ?? "Unknown";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full text-sm font-medium">
            {customerInitials}
          </div>
          <div>
            <h2 className="font-semibold">{customerDisplay}</h2>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <ChannelBadge channel={channel} />
              <StatusBadge status={status} />
              {agentName && (
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {agentName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-9 items-center justify-center rounded-md"
              title="Send email"
            >
              <Mail className="size-4" />
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-9 items-center justify-center rounded-md"
              title="Call"
            >
              <Phone className="size-4" />
            </a>
          )}
          <button
            type="button"
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-9 items-center justify-center rounded-md"
            title="More options"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Subject */}
      {subject && (
        <div className="text-muted-foreground border-b px-4 py-2 text-sm">
          <span className="text-foreground font-medium">Subject:</span>{" "}
          {subject}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              id={message.id}
              content={message.content}
              senderType={message.senderType}
              senderName={message.senderName}
              direction={message.direction}
              createdAt={message.createdAt}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          onSend={onSendMessage}
          disabled={disabled || status === "closed"}
          placeholder={
            status === "closed"
              ? "This conversation is closed"
              : "Type a message..."
          }
        />

        {/* Quick status actions */}
        {status !== "closed" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {status === "open" && onStatusChange && (
              <button
                type="button"
                onClick={() => onStatusChange("pending")}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Mark as pending
              </button>
            )}
            {(status === "open" || status === "pending") && onStatusChange && (
              <button
                type="button"
                onClick={() => onStatusChange("resolved")}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Resolve
              </button>
            )}
            {onAssign && (
              <button
                type="button"
                onClick={onAssign}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {agentName ? "Reassign" : "Assign"}
              </button>
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
