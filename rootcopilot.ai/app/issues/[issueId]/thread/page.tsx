"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
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

  // --------------------------------------------
  // STATE
  // --------------------------------------------
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isAssistantReplying, setIsAssistantReplying] = React.useState(false);

  const creatingRef = React.useRef(false);

  // --------------------------------------------
  // HOOKS
  // --------------------------------------------
  const textareaRef = useAutoGrowTextarea(input);
  const { ref: headerRef, height: headerHeight } = useElementHeight<HTMLDivElement>();
  const { ref: composerRef, height: composerHeight } = useElementHeight<HTMLDivElement>();
  
  // --------------------------------------------
  // CONVEX
  // --------------------------------------------
  const sendMessage = useMutation(api.thread_messages.sendMessage);
  const sendQuickActionUserMessage = useMutation(api.thread_messages.sendQuickActionUserMessage);
  const triggerReply = useAction(api.assistant.reply);
  const triggerQuickAction = useAction(api.assistant.quickAction);
  const createThread = useMutation(api.threads.create);

  const thread = useQuery(
    api.threads.getByIssue, 
    organization ? { issueId: issueId as Id<"issues">, orgId: organization.id } : "skip"
  );

  const messages = useQuery(
    api.thread_messages.getByThread,
    thread && organization ? { threadId: thread._id, orgId: organization.id } : "skip"
  );

  const issue = useQuery(
    api.issues.get, 
    organization ? { id: issueId as Id<"issues">, orgId: organization.id } : "skip"
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
    if (thread === null && organization && !creatingRef.current) {
      creatingRef.current = true;
      createThread({ issueId: issueId as Id<"issues">, orgId: organization.id }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [thread, issueId, createThread, organization]);

  // --------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------
  const handleSubmit = async () => {
    if (!thread || !input.trim() || !organization) return;

    setIsSending(true);
    setIsAssistantReplying(true);

    await sendMessage({
      threadId: thread._id,
      content: input.trim(),
      orgId: organization.id,
    });

    setInput("");

    await triggerReply({ threadId: thread._id, orgId: organization.id });

    scrollToBottom("smooth");
    updateScrollButton();

    setIsSending(false);
    setIsAssistantReplying(false);
  };

  // --------------------------------------------
  // QUICK ACTION HANDLER
  // --------------------------------------------
  const handleQuickAction = async (instruction: string) => {
    if (!thread || !organization) return;

    setIsAssistantReplying(true);

    await sendQuickActionUserMessage({
      threadId: thread._id,
      instruction,
      orgId: organization.id,
    });

    await triggerQuickAction({
      threadId: thread._id,
      instruction,
      orgId: organization.id,
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
      
      {/* HEADER */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-20 flex justify-center pointer-events-none"
      >
        <div
          className="
            pointer-events-auto w-[95%] max-w-3xl mx-auto mt-4
            bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl
            border border-neutral-200/60 dark:border-neutral-700/60
            shadow-lg shadow-black/10 dark:shadow-black/30
            rounded-2xl px-5 py-4
          "
        >
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {issue.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Issue #{issueId.slice(-6)} • {new Date(issue.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* SCROLL AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 space-y-2"
        style={{
          paddingTop: headerHeight + 16,
          paddingBottom: composerHeight + 24,
        }}
      >
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
          className="mx-auto max-w-3xl flex gap-3 items-center"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this issue…"
            className="
              flex-1 resize-none rounded-2xl border border-neutral-300 
              dark:border-neutral-700 bg-white dark:bg-neutral-800
              px-4 py-3 text-sm shadow-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          />
          <SendButton disabled={!input.trim() || isSending} />
        </form>
      </div>
    </div>
  );
}
