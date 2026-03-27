import { useRef, useState } from "react";
import { cva } from "class-variance-authority";
import { Paperclip, Send, Sparkles } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../button";

interface ChatInputProps {
  onSend: (content: string) => void;
  onCannedResponse?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const inputVariants = cva(
  "bg-background flex min-h-[56px] w-full items-end gap-2 rounded-lg border px-3 py-2",
  {
    variants: {
      focused: {
        true: "ring-primary/20 ring-2",
        false: "",
      },
    },
  },
);

export function ChatInput({
  onSend,
  onCannedResponse,
  placeholder = "Type a message...",
  disabled,
  className,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn(inputVariants({ focused: isFocused }))}>
        {onCannedResponse && (
          <button
            type="button"
            onClick={onCannedResponse}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
            title="Canned responses"
          >
            <Sparkles className="size-4" />
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="placeholder:text-muted-foreground max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        <button
          type="button"
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-md"
          title="Attach file"
        >
          <Paperclip className="size-4" />
        </button>

        <Button
          size="icon"
          variant="ghost"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="size-8 shrink-0"
          title="Send message"
        >
          <Send className="size-4" />
        </Button>
      </div>

      <p className="text-muted-foreground px-1 text-xs">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
