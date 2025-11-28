"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IconUser, IconRobot } from "@tabler/icons-react";
import MarkdownRenderer from "./markdown/MarkdownRenderer";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;

  isFirstOfGroup?: boolean;
  isLastOfGroup?: boolean;
}

export function ChatBubble({
  role,
  content,
  timestamp,
  isFirstOfGroup = true,
  isLastOfGroup = true,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        isLastOfGroup && "mb-3"
      )}
    >
      {/* Avatar – only show for first message in group */}
      {!isUser && isFirstOfGroup && (
        <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <IconRobot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] px-4 py-3 text-sm rounded-2xl",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-200",

          // Adjust corners based on grouping
          !isFirstOfGroup && isUser && "rounded-tr-none",
          !isFirstOfGroup && !isUser && "rounded-tl-none",

          !isLastOfGroup && isUser && "rounded-br-none",
          !isLastOfGroup && !isUser && "rounded-bl-none"
        )}
      >
        <MarkdownRenderer>{content}</MarkdownRenderer>

        {/* Timestamp only on last message of the group */}
        {timestamp && isLastOfGroup && (
          <div className={cn(
            "mt-2 text-xs opacity-60",
            isUser ? "text-blue-100" : "text-neutral-500 dark:text-neutral-400"
          )}>
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* User avatar on first message of the group */}
      {isUser && isFirstOfGroup && (
        <div className="ml-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
          <IconUser className="h-4 w-4 text-neutral-700 dark:text-neutral-200" />
        </div>
      )}
    </motion.div>
  );
}
