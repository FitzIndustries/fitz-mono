import type { ReactNode } from "react";
import { cva } from "class-variance-authority";
import { Mail, MessageCircle } from "lucide-react";

import { cn } from "../../lib/utils";

const channelBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      channel: {
        email:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        whatsapp:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      },
    },
    defaultVariants: {
      channel: "email",
    },
  },
);

interface ChannelBadgeProps {
  channel: "email" | "whatsapp";
  className?: string;
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const Icon = channel === "email" ? Mail : MessageCircle;
  const label = channel === "email" ? "Email" : "WhatsApp";

  return (
    <span className={cn(channelBadgeVariants({ channel }), className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: "open" | "pending" | "resolved" | "closed";
  className?: string;
}

const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        pending:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        resolved:
          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
      },
    },
    defaultVariants: {
      status: "open",
    },
  },
);

const statusIcons: Record<string, ReactNode> = {
  open: "●",
  pending: "◐",
  resolved: "✓",
  closed: "○",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusVariants({ status }), className)}>
      {statusIcons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent";
  className?: string;
}

const priorityVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      priority: {
        low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        medium:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      priority: "medium",
    },
  },
);

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <span className={cn(priorityVariants({ priority }), className)}>
      {labels[priority]}
    </span>
  );
}
