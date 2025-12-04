"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
import TypingBubble from "@/components/TypingBubble";
import QuickActions from "@/components/QuickActions";
import BottomFade from "@/components/BottomFade";
import ScrollToBottomButton from "@/components/ScrollToBottomButton";
import { groupMessages } from "@/lib/utils";

export default function ThreadPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = React.use(params);
  const { organization } = useOrganization();

  // --------------------------------------------
  // STATE + REFS
  // --------------------------------------------
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isAssistantReplying, setIsAssistantReplying] = React.useState(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const composerRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [headerHeight, setHeaderHeight] = React.useState(0);
  const [composerHeight, setComposerHeight] = React.useState(120);

  const creatingRef = React.useRef(false);

  // --------------------------------------------
  // CONVEX
  // --------------------------------------------
  const sendMessage = useMutation(api.thread_messages.sendMessage);
  const sendQuickActionUserMessage = useMutation(
    api.thread_messages.sendQuickActionUserMessage
  );
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

  // --------------------------------------------
  // MEASURE HEADER HEIGHT
  // --------------------------------------------
  React.useLayoutEffect(() => {
    if (!headerRef.current) return;

    const update = () => setHeaderHeight(headerRef.current!.offsetHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(headerRef.current);

    return () => ro.disconnect();
  }, []);

  // --------------------------------------------
  // MEASURE COMPOSER HEIGHT
  // --------------------------------------------
  React.useLayoutEffect(() => {
    if (!composerRef.current) return;

    const update = () => setComposerHeight(composerRef.current!.offsetHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(composerRef.current);

    return () => ro.disconnect();
  }, []);

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
  // SCROLL HELPERS
  // --------------------------------------------
  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior,
      });
    },
    []
  );

  const updateScrollButton = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 12;

    setShowScrollButton(!atBottom);
  }, []);

  // --- USER NEAR BOTTOM CHECK ---
  const isUserNearBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return false;

    return el.scrollHeight - (el.scrollTop + el.clientHeight) < 120;
  }, []);

  // --- NEW MESSAGES SCROLL ---
  React.useEffect(() => {
    if (!messages) return;

    const raf = requestAnimationFrame(() => {
      if (isUserNearBottom()) {
        scrollToBottom("smooth");
      }
      updateScrollButton();
    });

    return () => cancelAnimationFrame(raf);
  }, [messages, isUserNearBottom, scrollToBottom, updateScrollButton]);

  // --- STREAMING SCROLLING (ChatGPT style) ---
  React.useEffect(() => {
    if (!isAssistantReplying) return;

    const raf = requestAnimationFrame(() => {
      if (isUserNearBottom()) {
        scrollToBottom("smooth");
      }
      updateScrollButton();
    });

    return () => cancelAnimationFrame(raf);
  }, [
    isAssistantReplying,
    messages,
    isUserNearBottom,
    scrollToBottom,
    updateScrollButton,
  ]);

  // --------------------------------------------
  // DETECT SCROLL BUTTON SHOW/HIDE
  // --------------------------------------------
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handler = () => updateScrollButton();

    el.addEventListener("scroll", handler);
    handler(); // initial check

    return () => el.removeEventListener("scroll", handler);
  }, [updateScrollButton]);

  // --------------------------------------------
  // TEXTAREA AUTO-GROW
  // --------------------------------------------
  React.useEffect(() => {
    if (!textareaRef.current) return;
    const t = textareaRef.current;
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  }, [input]);

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

    // 1. First create a user-style message
    await sendQuickActionUserMessage({
      threadId: thread._id,
      instruction,
      orgId: organization.id,
    });

    // 2. Then trigger the assistant reply
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
  if (!organization) {
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
        className="
          fixed top-0 left-0 right-0 z-20 flex justify-center
          pointer-events-none
        "
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
            Issue #{issueId.slice(-6)} •{" "}
            {new Date(issue.created_at).toLocaleDateString()}
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
          
          // Find the last assistant message index
          const lastAssistantIndex = [...grouped].reverse().findIndex(
            (m) => m.role === "assistant"
          );
          const realIndex =
            lastAssistantIndex === -1 ? -1 : grouped.length - 1 - lastAssistantIndex;

          // Quick actions to show on last assistant message
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

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="
              rounded-full p-3 bg-blue-600 text-white shadow 
              hover:bg-blue-500 transition disabled:opacity-50
            "
          >
            <svg
              className="h-4 w-4 rotate-45"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeWidth={2} d="M5 12l14-7-7 14-2-5-5-2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
