"use client";

import * as React from "react";
import { IconRobot, IconSend, IconAlertTriangle } from "@tabler/icons-react";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
import TypingBubble from "@/components/TypingBubble";
import { groupMessages } from "@/lib/utils";
import {
  type Ticket,
  type Thread,
  type ThreadMessage,
  createThread,
  getThreadByIssue,
  listThreadMessages,
  sendThreadMessage,
  triggerAssistantReply,
  sendQuickActionUserMessage,
  triggerAssistantQuickAction,
} from "@/lib/rootcopilot-api";

// Suggestions shown in the empty state + attached to the latest assistant turn.
// Phrased as instructions the support engineer can act on for this ticket.
const SUGGESTIONS = [
  "What's the likely root cause?",
  "What logs or evidence should I check?",
  "Suggest concrete remediation steps",
  "Summarize this for a stakeholder update",
];

/**
 * Inline, self-contained conversation with the RootCopilot support engineer,
 * grounded in a single ticket's thread. Unlike the standalone thread page this
 * lives inside a flex column: messages scroll, the composer pins to the bottom
 * of the panel (no viewport-fixed positioning), so it composes into any layout.
 */
export function TicketConversation({
  ticketId,
  ticket,
}: {
  ticketId: string;
  ticket: Ticket | null;
}) {
  const [thread, setThread] = React.useState<Thread | null>(null);
  const [messages, setMessages] = React.useState<ThreadMessage[] | undefined>(undefined);
  const [input, setInput] = React.useState("");
  const [isReplying, setIsReplying] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [chatError, setChatError] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const refreshMessages = React.useCallback(async (threadId: string) => {
    setMessages(await listThreadMessages(threadId));
  }, []);

  // Load (or lazily create) the ticket's conversation thread.
  React.useEffect(() => {
    let cancelled = false;
    setThread(null);
    setMessages(undefined);
    setLoadError(null);

    (async () => {
      try {
        const t = await getThreadByIssue(ticketId).catch(() => createThread(ticketId));
        if (cancelled) return;
        setThread(t);
        await refreshMessages(t._id);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load the conversation.");
          setMessages([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId, refreshMessages]);

  // Auto-scroll to the newest message while a reply streams in.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isReplying]);

  // Auto-grow the composer up to a cap.
  React.useEffect(() => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
  }, [input]);

  const runTurn = React.useCallback(
    async (
      send: (threadId: string) => Promise<void>,
      reply: (threadId: string) => Promise<void>,
    ) => {
      if (!thread || isReplying) return;
      setIsReplying(true);
      setChatError(null);
      try {
        await send(thread._id);
        await refreshMessages(thread._id);
        await reply(thread._id);
        await refreshMessages(thread._id);
      } catch (e) {
        setChatError(e instanceof Error ? e.message : "The assistant didn't respond. Try again.");
        await refreshMessages(thread._id).catch(() => {});
      } finally {
        setIsReplying(false);
      }
    },
    [thread, isReplying, refreshMessages],
  );

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput("");
    await runTurn(
      (id) => sendThreadMessage({ threadId: id, content }),
      (id) => triggerAssistantReply(id),
    );
  };

  const handleQuickAction = async (instruction: string) => {
    await runTurn(
      (id) => sendQuickActionUserMessage({ threadId: id, instruction }),
      (id) => triggerAssistantQuickAction({ threadId: id, instruction }),
    );
  };

  const grouped = messages ? groupMessages(messages) : [];
  const lastAssistantIdx = (() => {
    for (let i = grouped.length - 1; i >= 0; i--) if (grouped[i].role === "assistant") return i;
    return -1;
  })();
  const isEmpty = messages !== undefined && grouped.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Identity strip — anchors the conversation to this ticket */}
      <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 px-5 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <IconRobot className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Support Engineer
          </div>
          <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {ticket ? `Investigating: ${ticket.title}` : "Grounded in this ticket's full context"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-1">
          {messages === undefined &&
            [...Array(3)].map((_, i) => <ChatBubbleSkeleton key={i} />)}

          {loadError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              {loadError}
            </div>
          )}

          {isEmpty && !loadError && (
            <EmptyState ticket={ticket} onPick={handleSend} />
          )}

          {grouped.map((m, i) => (
            <ChatBubble
              key={m._id}
              role={m.role}
              content={m.content}
              timestamp={m.created_at}
              isFirstOfGroup={m.isFirst}
              isLastOfGroup={m.isLast}
              isStreaming={isReplying && i === lastAssistantIdx && m.role === "assistant"}
              quickActions={i === lastAssistantIdx && !isReplying ? SUGGESTIONS : undefined}
              onQuickAction={handleQuickAction}
            />
          ))}

          {isReplying && <TypingBubble />}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {chatError && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <span className="flex items-center gap-1.5">
                <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {chatError}
              </span>
              <button onClick={() => setChatError(null)} className="shrink-0 font-semibold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/60 transition"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={!thread || !!loadError}
              placeholder="Ask the support engineer about this ticket…"
              className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isReplying || !thread}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow transition hover:bg-blue-500 disabled:opacity-40"
              aria-label="Send message"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </form>
          <p className="px-1 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
            Grounded in this ticket&rsquo;s description, comments, and analysis. Verify before acting.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  ticket,
  onPick,
}: {
  ticket: Ticket | null;
  onPick: (text: string) => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-2 py-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <IconRobot className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        Let&rsquo;s work through this ticket
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        {ticket
          ? `I've read "${ticket.title}" and its context. Ask anything, or start with:`
          : "Ask anything about this ticket, or start with:"}
      </p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-left text-sm text-neutral-700 dark:text-neutral-300 transition hover:border-blue-400 hover:bg-blue-50/50 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
