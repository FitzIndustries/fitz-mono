import { cva } from "class-variance-authority";
import { format } from "date-fns";
import { Bot, User } from "lucide-react";

import { cn } from "../../lib/utils";

interface MessageBubbleProps {
  id: string;
  content: string;
  senderType: "customer" | "agent" | "system" | "bot";
  senderName?: string | null;
  direction: "inbound" | "outbound";
  createdAt: Date | number;
  isAgent?: boolean;
  className?: string;
}

const bubbleVariants = cva("max-w-[75%] rounded-2xl px-4 py-2 text-sm", {
  variants: {
    senderType: {
      customer: "rounded-2xl rounded-bl-md",
      agent: "rounded-2xl rounded-br-md",
      bot: "rounded-2xl rounded-br-md",
      system:
        "bg-muted text-muted-foreground mx-auto max-w-max rounded-md px-3 py-1 text-xs",
    },
    direction: {
      inbound: "bg-primary text-primary-foreground",
      outbound: "bg-accent text-accent-foreground",
    },
  },
  compoundVariants: [
    {
      senderType: "customer",
      direction: "inbound",
      className: "bg-primary text-primary-foreground",
    },
    {
      senderType: "agent",
      direction: "outbound",
      className: "bg-accent text-accent-foreground",
    },
    {
      senderType: "bot",
      direction: "outbound",
      className:
        "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
    },
  ],
  defaultVariants: {
    senderType: "customer",
    direction: "inbound",
  },
});

export function MessageBubble({
  content,
  senderType,
  senderName,
  direction,
  createdAt,
  className,
}: MessageBubbleProps) {
  const isSystem = senderType === "system";

  if (isSystem) {
    return (
      <div className={cn("flex justify-center", className)}>
        <span className={bubbleVariants({ senderType: "system" })}>
          {content}
        </span>
      </div>
    );
  }

  const showAvatar = senderType === "agent" || senderType === "bot";
  const initials = senderName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        direction === "outbound" && "flex-row-reverse",
        className,
      )}
    >
      {showAvatar && (
        <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs">
          {senderType === "bot" ? (
            <Bot className="size-4" />
          ) : (
            (initials ?? <User className="size-4" />)
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1",
          direction === "outbound" && "items-end",
        )}
      >
        {senderName && (
          <span className="text-muted-foreground text-xs">{senderName}</span>
        )}
        <div className={cn(bubbleVariants({ senderType, direction }))}>
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <span className="text-muted-foreground text-xs">
          {format(new Date(createdAt), "HH:mm")}
        </span>
      </div>
    </div>
  );
}
