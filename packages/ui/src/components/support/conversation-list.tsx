import { cva } from "class-variance-authority";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";

import { cn } from "../../lib/utils";
import { ChannelBadge, StatusBadge } from "./badges";

interface ConversationListItemProps {
  id: string;
  customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  channel: "email" | "whatsapp";
  status: "open" | "pending" | "resolved" | "closed";
  subject?: string | null;
  lastMessage?: {
    content: string;
    createdAt: Date | number;
  };
  assignedAgent?: {
    name?: string | null;
  } | null;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const listItemVariants = cva(
  "hover:bg-accent/50 flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
  {
    variants: {
      selected: {
        true: "bg-accent border-accent",
        false: "border-transparent",
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

export function ConversationListItem({
  customer,
  channel,
  status,
  subject,
  lastMessage,
  assignedAgent,
  isSelected,
  onClick,
  className,
}: ConversationListItemProps) {
  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (customer.email?.[0]?.toUpperCase() ?? "?");

  const displayName =
    customer.name ?? customer.email ?? customer.phone ?? "Unknown";
  const preview = lastMessage?.content.slice(0, 50) ?? subject ?? "No messages";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(listItemVariants({ selected: isSelected }), className)}
    >
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium">
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{displayName}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {lastMessage?.createdAt
              ? formatDistanceToNow(new Date(lastMessage.createdAt), {
                  addSuffix: true,
                })
              : ""}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <ChannelBadge channel={channel} />
          <StatusBadge status={status} />
        </div>

        <p className="text-muted-foreground mt-1 truncate text-sm">{preview}</p>

        {assignedAgent && (
          <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
            <User className="size-3" />
            <span className="truncate">
              {assignedAgent.name ?? "Unassigned"}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
