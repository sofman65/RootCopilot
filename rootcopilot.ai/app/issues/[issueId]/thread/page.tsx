"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import TypingBubble from "@/components/TypingBubble";
import QuickActions from "@/components/QuickActions";
import BottomFade from "@/components/BottomFade";
import ScrollToBottomButton from "@/components/ScrollToBottomButton";
import { SendButton } from "@/components/shared";
import { 
  useAutoGrowTextarea, 
  useScrollToBottom, 
  useOrgGuard,
  useElementHeight,
} from "@/lib/hooks";

import type { Doc } from "@/convex/_generated/dataModel";
import type { ChatRole } from "@/convex/lib/types";

// Group messages by role for visual clustering
function groupMessages(messages: Doc<"thread_messages">[]) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const isFirst = !prev || prev.role !== msg.role;
    const isLast = !next || next.role !== msg.role;
    return { ...msg, isFirst, isLast };
  });
}

export default function ThreadPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = React.use(params);
  const { organization, hasOrganization } = useOrgGuard({ shouldRedirect: false });
  const orgId = organization?.id;

  // --------------------------------------------
  // STATE
  // --------------------------------------------
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isAssistantReplying, setIsAssistantReplying] = React.useState(false);
  const [docMode, setDocMode] = React.useState(false);
  const [docAnswer, setDocAnswer] = React.useState<string | null>(null);
  const [docSources, setDocSources] = React.useState<
    Array<{ chunk: string; doc: { name?: string; namespace: string } | null }>
  >([]);
  const [askingDocs, setAskingDocs] = React.useState(false);

  const creatingRef = React.useRef(false);

  // --------------------------------------------
  // HOOKS
  // --------------------------------------------
  const textareaRef = useAutoGrowTextarea(input);
  const { ref: composerRef, height: composerHeight } = useElementHeight<HTMLDivElement>();
  
  // --------------------------------------------
  // CONVEX
  // --------------------------------------------
  const sendMessage = useMutation(api.thread_messages.sendMessage);
  const sendQuickActionUserMessage = useMutation(api.thread_messages.sendQuickActionUserMessage);
  const triggerReply = useAction(api.assistant.reply);
  const triggerQuickAction = useAction(api.assistant.quickAction);
  const createThread = useMutation(api.threads.create);
  const askDocs = useAction(api.rag.ask);

  const thread = useQuery(
    api.threads.getByIssue, 
    orgId ? { issueId: issueId as Id<"issues">, orgId } : "skip"
  );

  const messages = useQuery(
    api.thread_messages.getByThread,
    thread && orgId ? { threadId: thread._id, orgId } : "skip"
  );

  const issue = useQuery(
    api.issues.get, 
    orgId ? { id: issueId as Id<"issues">, orgId } : "skip"
  );

  // Use scroll hook with messages as dependency
  const { 
    scrollRef, 
    showScrollButton, 
    scrollToBottom, 
    isNearBottom,
    updateScrollButton,
  } = useScrollToBottom({ 
    dependencies: [messages, isAssistantReplying] 
  });

  // --------------------------------------------
  // CREATE THREAD IF MISSING
  // --------------------------------------------
  React.useEffect(() => {
    if (thread === null && orgId && !creatingRef.current) {
      creatingRef.current = true;
      createThread({ issueId: issueId as Id<"issues">, orgId }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [thread, issueId, createThread, orgId]);

  // --------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------
  const handleSubmit = async () => {
    if (!input.trim() || !orgId) return;

    // Doc mode: ask RAG and render locally (not added to thread)
    if (docMode) {
      setAskingDocs(true);
      setDocAnswer(null);
      setDocSources([]);
      try {
        const res = await askDocs({
          question: input.trim(),
          orgId,
        });
        setDocAnswer(res.answer);
        setDocSources(res.contexts ?? []);
      } catch (err) {
        setDocAnswer("Could not fetch doc answer right now.");
      } finally {
        setInput("");
        setAskingDocs(false);
      }
      return;
    }

    // Regular thread message
    if (!thread) return;
    setIsSending(true);
    setIsAssistantReplying(true);

    await sendMessage({
      threadId: thread._id,
      content: input.trim(),
      orgId,
    });

    setInput("");

    await triggerReply({ threadId: thread._id, orgId });

    scrollToBottom("smooth");
    updateScrollButton();

    setIsSending(false);
    setIsAssistantReplying(false);
  };

  // --------------------------------------------
  // QUICK ACTION HANDLER
  // --------------------------------------------
  const handleQuickAction = async (instruction: string) => {
    if (!thread || !orgId) return;

    setIsAssistantReplying(true);

    await sendQuickActionUserMessage({
      threadId: thread._id,
      instruction,
      orgId,
    });

    await triggerQuickAction({
      threadId: thread._id,
      instruction,
      orgId,
    });

    scrollToBottom("smooth");
    updateScrollButton();

    setIsAssistantReplying(false);
  };

  // --------------------------------------------
  // LOADING STATES
  // --------------------------------------------
  if (!hasOrganization) {
    return <div className="p-6">Please select an organization…</div>;
  }
  
  if (!issue || !thread) {
    return <div className="p-6">Loading…</div>;
  }

  // --------------------------------------------
  // UI
  // --------------------------------------------
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      
      {/* SCROLL AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 space-y-2"
        style={{
          paddingTop: 16,
          paddingBottom: composerHeight + 160,
        }}
      >
        <div className="max-w-4xl mx-auto mt-4">
          <div
            className="
              w-full rounded-2xl px-5 py-4 mb-4
              bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl
              border border-neutral-200/60 dark:border-neutral-700/60
              shadow-lg shadow-black/10 dark:shadow-black/30
            "
          >
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {issue.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Issue #{issueId.slice(-6)} • {new Date(issue.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 mb-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Summary</p>
            {issue.description ? (
              <MarkdownRenderer>
                {issue.description}
              </MarkdownRenderer>
            ) : (
              <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                No description provided for this issue yet.
              </p>
            )}
          </div>
        </div>

        {docAnswer && (
          <div className="max-w-3xl mx-auto w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-neutral-100">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs uppercase tracking-wide text-blue-300/80">Doc answer</p>
              {askingDocs && <span className="text-[11px] text-neutral-500">Refreshing…</span>}
            </div>
            <p className="whitespace-pre-wrap">{docAnswer}</p>
            {docSources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {docSources.map((s, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-1 rounded-full border border-neutral-700 text-neutral-300"
                  >
                    {s.doc?.name ?? "Doc"} · {s.doc?.namespace ?? "global"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {messages === undefined ? (
          [...Array(4)].map((_, i) => <ChatBubbleSkeleton key={i} />)
        ) : (() => {
          const grouped = groupMessages(messages);
          
          const lastAssistantIndex = [...grouped].reverse().findIndex(
            (m) => m.role === "assistant"
          );
          const realIndex =
            lastAssistantIndex === -1 ? -1 : grouped.length - 1 - lastAssistantIndex;

          const actions = [
            "Summarize",
            "Suggest Fix",
            "Debug Frontend",
            "Explain Root Cause",
          ];

          return grouped.map((m, i) => (
            <ChatBubble
              key={m._id}
              role={m.role}
              content={m.content}
              timestamp={m.created_at}
              isFirstOfGroup={m.isFirst}
              isLastOfGroup={m.isLast}
              isStreaming={
                isAssistantReplying && i === realIndex && m.role === "assistant"
              }
              quickActions={i === realIndex ? actions : undefined}
              onQuickAction={handleQuickAction}
            />
          ));
        })()}

        {isAssistantReplying && <TypingBubble />}
        <BottomFade />
      </div>

      {/* FLOATING BUTTON */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={() => scrollToBottom("smooth")}
      />

      {/* COMPOSER */}
      <div
        ref={composerRef}
        className="
          fixed bottom-0 left-0 right-0 z-30
          bg-white/90 dark:bg-neutral-900/90 
          backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-700
          px-4 pt-3 pb-4
        "
      >
        <div className="mx-auto max-w-3xl mb-3">
          <QuickActions onAction={handleQuickAction} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mx-auto max-w-3xl flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={docMode ? "Ask with docs (runbooks, configs, logs)…" : "Ask about this issue…"}
              className="
                flex-1 resize-none rounded-2xl border border-neutral-300 
                dark:border-neutral-700 bg-white dark:bg-neutral-800
                px-4 py-3 text-sm shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
            <SendButton disabled={!input.trim() || isSending || askingDocs} />
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={docMode}
                onChange={(e) => setDocMode(e.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span>Ask with docs (RAG). Does not post to the thread.</span>
            </label>
            {(isSending || askingDocs) && (
              <span className="text-neutral-400">
                {docMode ? "Searching docs…" : "Sending to assistant…"}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
