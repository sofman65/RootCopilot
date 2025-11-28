"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { IconUser, IconRobot } from "@tabler/icons-react";
import MarkdownRenderer from "./markdown/MarkdownRenderer";
  

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  className?: string;
}

export function ChatBubble({ role, content, timestamp, className }: ChatBubbleProps) {
  const isUser = role === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-3 p-4",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <IconRobot className="h-4 w-4" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
        )}
      >
      <MarkdownRenderer>{content}</MarkdownRenderer>
        {timestamp && (
          <div
            className={cn(
              "mt-2 text-xs opacity-70",
              isUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
          <IconUser className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}


