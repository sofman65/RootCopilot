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
import { IconMessageCircle } from "@tabler/icons-react";
import { groupMessages } from "@/lib/utils";

export default function ThreadPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = React.use(params);

  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isAssistantReplying, setIsAssistantReplying] = React.useState(false);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const composerRef = React.useRef<HTMLDivElement | null>(null);
  const headerWrapperRef = React.useRef<HTMLDivElement | null>(null);

  const [composerHeight, setComposerHeight] = React.useState(120); // default
  const [headerHeight, setHeaderHeight] = React.useState(0);

  const sendMessage = useMutation(api.thread_messages.sendMessage);
  const triggerAssistantReply = useAction(api.assistant.reply);
  const triggerQuickAction = useAction(api.assistant.quickAction);
  const createThread = useMutation(api.threads.create);
  const creatingRef = React.useRef(false);

  const thread = useQuery(api.threads.getByIssue, { issueId: issueId as Id<"issues"> });
  const messages = useQuery(
    api.thread_messages.getByThread,
    thread ? { threadId: thread._id } : "skip"
  );
  const issue = useQuery(api.issues.get, { id: issueId as Id<"issues"> });

  // ----------------------------------------------
  // 1. Measure header height dynamically
  // ----------------------------------------------
  React.useLayoutEffect(() => {
    if (!headerWrapperRef.current) return;
    const update = () => {
      setHeaderHeight(headerWrapperRef.current!.offsetHeight);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(headerWrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // ----------------------------------------------
  // 2. REAL ChatGPT FIX — measure composer height
  // ----------------------------------------------
  React.useLayoutEffect(() => {
    if (!composerRef.current) return;
    const update = () => setComposerHeight(composerRef.current!.offsetHeight);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(composerRef.current);
    return () => ro.disconnect();
  }, []);

  // ----------------------------------------------
  // 2. create thread if missing
  // ----------------------------------------------
  React.useEffect(() => {
    if (thread === null && !creatingRef.current) {
      creatingRef.current = true;
      createThread({ issueId: issueId as Id<"issues"> }).finally(() => {
        creatingRef.current = false;
      });
    }
  }, [thread, issueId, createThread]);

  // ----------------------------------------------
  // Utility: Scroll to bottom
  // ----------------------------------------------
  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    []
  );

  const updateScrollButton = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    setShowScrollButton(!atBottom);
  }, []);

  // ----------------------------------------------
  // 3. Auto scroll AFTER messages update
  // ----------------------------------------------
  React.useEffect(() => {
    if (!messages) return;
    const id = requestAnimationFrame(() => {
      scrollToBottom("auto");
      updateScrollButton();
    });
    return () => cancelAnimationFrame(id);
  }, [messages, scrollToBottom, updateScrollButton]);

  // Scroll on assistant streaming
  React.useEffect(() => {
    if (isAssistantReplying) {
      const id = requestAnimationFrame(() => {
        scrollToBottom("smooth");
        updateScrollButton();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isAssistantReplying, scrollToBottom, updateScrollButton]);

  // ----------------------------------------------
  // 4. Scroll button detection
  // ----------------------------------------------
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      setShowScrollButton(!atBottom);
    };

    el.addEventListener("scroll", update);
    update();

    return () => el.removeEventListener("scroll", update);
  }, []);

  // ----------------------------------------------
  // Auto grow textarea
  // ----------------------------------------------
  React.useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [input]);

  // ----------------------------------------------
  // Sending logic
  // ----------------------------------------------
  const handleSubmit = async () => {
    if (!thread || !input.trim()) return;

    setIsSending(true);
    setIsAssistantReplying(true);

    await sendMessage({ threadId: thread._id, content: input.trim() });
    setInput("");

    await triggerAssistantReply({ threadId: thread._id });
    scrollToBottom("smooth");
    updateScrollButton();

    setIsSending(false);
    setIsAssistantReplying(false);
  };

  // ----------------------------------------------
  // MAIN UI
  // ----------------------------------------------
  if (!issue || !thread) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* HEADER */}
      <div
        ref={headerWrapperRef}
        className="
          fixed top-[max(env(safe-area-inset-top),0px)]
          left-0 right-0 z-20
          flex justify-center
          pointer-events-none
        "
      >
        <div
          className="
            pointer-events-auto
            w-[95%] max-w-3xl 
            mx-auto mt-4
            bg-white/85 dark:bg-neutral-900/85
            backdrop-blur-xl
            border border-neutral-200/60 dark:border-neutral-700/60
            shadow-lg shadow-black/10 dark:shadow-black/30
            rounded-2xl
            px-5 py-4
          "
        >
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{issue.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Issue #{issueId.slice(-6)} •{" "}
            {new Date(issue.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* SCROLL AREA */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 space-y-1"
        style={{ 
          paddingTop: `calc(${headerHeight}px + env(safe-area-inset-top))`,
          paddingBottom: `calc(${composerHeight}px + env(safe-area-inset-bottom))`
        }}
      >
        {messages === undefined
          ? [...Array(4)].map((_, i) => <ChatBubbleSkeleton key={i} />)
          : groupMessages(messages).map((m) => (
              <ChatBubble
                key={m._id}
                role={m.role}
                content={m.content}
                timestamp={m.created_at}
                isFirstOfGroup={m.isFirst}
                isLastOfGroup={m.isLast}
              />
            ))}

        {isAssistantReplying && <TypingBubble />}
        <BottomFade />
      </div>

      {/* FLOATING BUTTON */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={() => scrollToBottom("smooth")}
      />

      {/* COMPOSER (fixed bottom) */}
      <div
        ref={composerRef}
        className="fixed bottom-0 left-0 right-0 z-30 pb-[max(env(safe-area-inset-bottom),16px)] bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-700 px-4 pt-3"
      >
        <div className="mx-auto max-w-3xl mb-3">
          <QuickActions onAction={(i) => triggerQuickAction({ threadId: thread._id, instruction: i })} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="mx-auto max-w-3xl flex gap-3 items-end"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 resize-none rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask about this issue…"
          />

          <button
            disabled={!input.trim() || isSending}
            className="rounded-full p-3 bg-blue-600 text-white shadow hover:bg-blue-500 transition"
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
