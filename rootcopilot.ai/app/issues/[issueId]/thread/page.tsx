"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
import TypingBubble from "@/components/TypingBubble";
import QuickActions from "@/components/QuickActions";

import { IconMessageCircle } from "@tabler/icons-react";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = React.use(params);

  // --------------------------------------
  // STATE
  // --------------------------------------
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isAssistantReplying, setIsAssistantReplying] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const creatingRef = React.useRef(false);

  // --------------------------------------
  // CONVEX FUNCTIONS
  // --------------------------------------
  const sendMessage = useMutation(api.thread_messages.sendMessage);
  const triggerAssistantReply = useAction(api.assistant.reply);
  const triggerQuickAction = useAction(api.assistant.quickAction);
  const createThread = useMutation(api.threads.create);

  // --------------------------------------
  // QUERIES
  // --------------------------------------
  const thread = useQuery(api.threads.getByIssue, {
    issueId: issueId as Id<"issues">,
  });

  const messages = useQuery(
    api.thread_messages.getByThread,
    thread ? { threadId: thread._id } : "skip"
  );

  const issue = useQuery(api.issues.get, {
    id: issueId as Id<"issues">,
  });

  // --------------------------------------
  // CREATE THREAD IF DOESN'T EXIST
  // --------------------------------------
  React.useEffect(() => {
    if (thread === null && !creatingRef.current) {
      creatingRef.current = true;
      createThread({ issueId: issueId as Id<"issues"> }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [thread, issueId, createThread]);

  // --------------------------------------
  // AUTOSCROLL ON NEW MESSAGES OR REPLY
  // --------------------------------------
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAssistantReplying]);

  // --------------------------------------
  // AUTOGROW TEXTAREA
  // --------------------------------------
  React.useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [input]);

  // --------------------------------------
  // USER SENDS MESSAGE
  // --------------------------------------
  const handleSubmit = React.useCallback(async () => {
    if (!thread || !input.trim()) return;

    setIsSending(true);
    setIsAssistantReplying(true);

    try {
      await sendMessage({
        threadId: thread._id,
        content: input.trim(),
      });

      setInput("");

      // Trigger full streaming assistant response
      await triggerAssistantReply({
        threadId: thread._id,
      });
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
      setIsAssistantReplying(false);
    }
  }, [thread, input, sendMessage, triggerAssistantReply]);

  // --------------------------------------
  // QUICK ACTION HANDLER
  // --------------------------------------
  const handleQuickAction = async (instruction: string) => {
    if (!thread) return;
    setIsAssistantReplying(true);
    try {
      await triggerQuickAction({
        threadId: thread._id,
        instruction,
      });
    } finally {
      setIsAssistantReplying(false);
    }
  };

  // --------------------------------------
  // LOADING STATES
  // --------------------------------------
  if (thread === undefined || issue === undefined) {
    return (
      <div className="flex h-full w-full flex-1 flex-col">
        <div className="border-b p-6 border-neutral-200 dark:border-neutral-700">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...Array(4)].map((_, i) => (
            <ChatBubbleSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex flex-col h-full justify-center items-center">
        <IconMessageCircle className="h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-semibold">Preparing thread…</h2>
        <p className="text-sm text-gray-500">Creating a conversation…</p>
      </div>
    );
  }

  // --------------------------------------
  // MAIN UI
  // --------------------------------------
  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {/* HEADER */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {issue?.title}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Issue #{issueId.slice(-6)} • Created{" "}
          {issue
            ? new Date(issue.created_at).toLocaleDateString()
            : "Unknown date"}
        </p>
      </div>

      {/* MESSAGES */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages === undefined ? (
          [...Array(4)].map((_, i) => <ChatBubbleSkeleton key={i} />)
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <IconMessageCircle className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">Start the conversation</h3>
            <p className="text-sm text-gray-500">Send your first message.</p>
          </div>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m._id}
              role={m.role}
              content={m.content}
              timestamp={m.created_at}
            />
          ))
        )}

        {/* ASSISTANT TYPING INDICATOR */}
        {isAssistantReplying && <TypingBubble />}
      </div>

      {/* QUICK ACTIONS */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 pb-1">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* MESSAGE COMPOSER */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex gap-2 items-end"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Ask about this issue…"
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Enter to send • Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
