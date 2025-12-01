// app/copilot/page.tsx
"use client";

import * as React from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatBubbleSkeleton } from "@/components/ChatBubbleSkeleton";
import TypingBubble from "@/components/TypingBubble";

import {
  IconSparkles,
  IconBook2,
  IconUpload,
  IconInfoCircle,
} from "@tabler/icons-react";

type ChatRole = "user" | "assistant";

interface LocalMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: number;
}

export default function CopilotPage() {
  // -------------------------------
  // CHAT STATE
  // -------------------------------
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<LocalMessage[]>([]);
  const [isAsking, setIsAsking] = React.useState(false);
  const [lastSources, setLastSources] = React.useState<
    { doc?: { name?: string | null; type?: string | null; namespace?: string | null }; score: number }[]
  >([]);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const ask = useAction(api.rag.ask);
  const docs = useQuery(api.rag.listDocs);

  // -------------------------------
  // INGESTION STATE (UPLOAD)
  // -------------------------------
  const addDoc = useAction(api.rag.addDocument);
  const [namespace, setNamespace] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  // Auto-grow textarea
  React.useEffect(() => {
    if (!textareaRef.current) return;
    const t = textareaRef.current;
    t.style.height = "auto";
    t.style.height = t.scrollHeight + "px";
  }, [input]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isAsking]);

  // -------------------------------
  // CHAT HANDLER
  // -------------------------------
  const handleSubmit = async () => {
    const question = input.trim();
    if (!question) return;

    const now = Date.now();
    const userMsg: LocalMessage = {
      id: `local-user-${now}`,
      role: "user",
      content: question,
      created_at: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsAsking(true);
    setLastSources([]);

    try {
      const res = await ask({ question });

      const assistantMsg: LocalMessage = {
        id: `local-assistant-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        created_at: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (res.contexts && Array.isArray(res.contexts)) {
        setLastSources(
          res.contexts.map((c: any) => ({
            doc: c.doc,
            score: c.score,
          }))
        );
      }
    } catch (err) {
      console.error("Copilot ask failed:", err);
      const errorMsg: LocalMessage = {
        id: `local-error-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ I ran into an error while answering. Please try again or check the logs.",
        created_at: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  // -------------------------------
  // FILE UPLOAD HANDLERS
  // -------------------------------
  function inferTypeFromName(name: string): "text" | "log" | "markdown" | "pdf" {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "log":
        return "log";
      case "md":
      case "mdx":
        return "markdown";
      case "pdf":
        return "pdf";
      default:
        return "text";
    }
  }

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      let successCount = 0;

      // MVP: use File.text() even for PDFs.
      // For production, plug in pdf.js on backend or a proper extractor.
      for (const file of Array.from(files)) {
        const text = await file.text();
        const type = inferTypeFromName(file.name);

        if (!text.trim()) continue;

        await addDoc({
          name: file.name,
          type,
          text,
          namespace: namespace.trim() || undefined,
        });

        successCount += 1;
      }

      if (successCount > 0) {
        setUploadStatus(`Indexed ${successCount} file${successCount > 1 ? "s" : ""} successfully.`);
      } else {
        setUploadStatus("No non-empty files were indexed.");
      }
    } catch (err: any) {
      console.error("Upload/ingest error:", err);
      setUploadError("Failed to index one or more files. Check console/logs.");
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="flex h-full w-full">
      {/* LEFT: Chat */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow">
              <IconSparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                RootCopilot – Global Copilot
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Ask about system docs, logs, configs, and more. Powered by your RAG index.
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-2"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                <p className="mb-2">
                  Start by asking RootCopilot something like:
                </p>
                <p className="font-medium">
                  “Explain the main failure modes in our DEV vs UAT environments.”
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <ChatBubble
                key={m.id}
                role={m.role}
                content={m.content}
                timestamp={m.created_at}
                isFirstOfGroup
                isLastOfGroup
              />
            ))
          )}

          {isAsking && <TypingBubble />}
        </div>

        {/* Composer */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-4 md:px-8 py-4">
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
              placeholder="Ask RootCopilot anything about your docs, logs, or configs…"
              className="
                flex-1 resize-none rounded-2xl border border-neutral-300 
                dark:border-neutral-700 bg-white dark:bg-neutral-800
                px-4 py-3 text-sm shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
            <button
              type="submit"
              disabled={!input.trim() || isAsking}
              className="
                rounded-full p-3 bg-blue-600 text-white shadow 
                hover:bg-blue-500 transition 
                disabled:opacity-50 disabled:hover:bg-blue-600
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
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 mx-auto max-w-3xl">
            Enter to send • Shift+Enter for newline
          </p>
        </div>
      </div>

      {/* RIGHT: Context panel + Upload */}
      <aside className="hidden lg:flex w-80 xl:w-96 border-l border-neutral-200 dark:border-neutral-800 flex-col h-full bg-neutral-50/60 dark:bg-neutral-950/60">
        {/* Indexed Knowledge header */}
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <IconBook2 className="h-4 w-4 text-neutral-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
            Indexed Knowledge
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
          {/* Add Context / Upload */}
          <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 px-3 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
              <p className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-100">
                Add Context
              </p>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex gap-1 items-start">
              <IconInfoCircle className="h-3 w-3 mt-[2px]" />
              <span>
                Upload <strong>.pdf, .txt, .md, .log</strong> files. They&apos;ll be embedded and used
                to answer future questions.
              </span>
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                placeholder="Namespace (e.g. logs, psp-docs, configs)…"
                className="
                  w-full rounded border border-neutral-300 dark:border-neutral-700
                  bg-transparent px-2 py-1 text-[11px]
                  focus:outline-none focus:ring-1 focus:ring-blue-500
                "
              />
              <label
                className="
                  flex flex-col items-center justify-center gap-1
                  border border-dashed border-neutral-300 dark:border-neutral-700
                  rounded-md px-2 py-3 text-[11px] text-neutral-600 dark:text-neutral-300
                  cursor-pointer hover:border-blue-500 hover:text-blue-600
                  transition
                "
              >
                <span className="font-medium">Click to select files</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Supports .pdf, .txt, .md, .log
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.txt,.md,.log"
                  onChange={(e) => void handleFilesSelected(e.target.files)}
                />
              </label>
            </div>

            {isUploading && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Indexing files…
              </p>
            )}
            {uploadStatus && !isUploading && (
              <p className="text-[11px] text-green-600 dark:text-green-400">
                {uploadStatus}
              </p>
            )}
            {uploadError && !isUploading && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            )}
          </section>

          {/* Recently Indexed Docs */}
          <section>
            <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1 text-[11px]">
              Recently Indexed Docs
            </p>
            <div className="space-y-1">
              {docs === undefined && (
                <div className="text-neutral-500">Loading…</div>
              )}
              {docs && docs.length === 0 && (
                <div className="text-neutral-500">
                  No docs yet. Upload or ingest via API.
                </div>
              )}
              {docs &&
                docs.slice(0, 8).map((d) => (
                  <div
                    key={d._id}
                    className="rounded border border-neutral-200 dark:border-neutral-800 px-2 py-1"
                  >
                    <div className="text-[11px] font-medium text-neutral-800 dark:text-neutral-100 line-clamp-1">
                      {d.name}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {d.type} {d.namespace ? `• ${d.namespace}` : ""} •{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Last Answer Sources */}
          {lastSources.length > 0 && (
            <section>
              <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1 text-[11px]">
                Last Answer Sources
              </p>
              <div className="space-y-1">
                {lastSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-blue-100/70 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/40 px-2 py-1"
                  >
                    <div className="text-[11px] font-medium text-neutral-900 dark:text-neutral-50 line-clamp-1">
                      {s.doc?.name ?? "Unknown doc"}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {s.doc?.type ?? "—"}
                      {s.doc?.namespace ? ` • ${s.doc.namespace}` : ""} • score:{" "}
                      {s.score.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
