"use client";

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

import { ChatBubble } from "@/components/ChatBubble";
import TypingBubble from "@/components/TypingBubble";
import { IconSparkles, IconUpload, IconInfoCircle, IconBook2, IconRefresh } from "@tabler/icons-react";

// ------------------------------
// TYPES
// ------------------------------
type ChatRole = "user" | "assistant";
interface LocalMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at: number;
}

interface RagEntry {
  entryId: string;
  title?: string;
  namespace?: string;
  createdAt?: number;
}

// ------------------------------
// COMPONENT
// ------------------------------
export default function CopilotPage() {
  // CHAT
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sources, setSources] = React.useState<Array<{
    chunk: string;
    score: number;
    doc: { name?: string; namespace: string } | null;
  }>>([]);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // RAG ACTIONS
  const addDoc = useAction(api.rag.addDocument);
  const ask = useAction(api.rag.ask);
  const listEntries = useAction(api.rag.listEntries);

  // INDEXED DOCS LIST (fetched via action)
  const [docs, setDocs] = React.useState<RagEntry[]>([]);
  const [loadingDocs, setLoadingDocs] = React.useState(false);

  // FILE UPLOAD STATE
  const [namespace, setNamespace] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);

  // Fetch docs on mount and after uploads
  const fetchDocs = React.useCallback(async () => {
    setLoadingDocs(true);
    try {
      const entries = await listEntries({ namespace: namespace || undefined });
      setDocs(entries);
    } catch (err) {
      console.error("Failed to fetch entries:", err);
    } finally {
      setLoadingDocs(false);
    }
  }, [listEntries, namespace]);

  React.useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------
  // UI AUTO EFFECTS
  // ------------------------------
  React.useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [input]);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // ------------------------------
  // SEND MESSAGE
  // ------------------------------
  const handleSend = async () => {
    const q = input.trim();
    if (!q) return;

    // push user message
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u-${now}`, role: "user", content: q, created_at: now },
    ]);

    setInput("");
    setIsLoading(true);
    setSources([]);

    try {
      const res = await ask({ question: q, namespace: namespace || undefined });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.answer,
          created_at: Date.now(),
        },
      ]);

      if (res.contexts) setSources(res.contexts);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Something went wrong. Try again.",
          created_at: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------
  // FILE INGESTION
  // ------------------------------
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    setUploading(true);
    setUploadStatus(null);

    let count = 0;

    for (const f of Array.from(files)) {
      const txt = await f.text();
      if (!txt.trim()) continue;

      await addDoc({
        name: f.name,
        text: txt,
        namespace: namespace || undefined,
      });

      count++;
    }

    setUploadStatus(`Indexed ${count} file${count !== 1 ? "s" : ""}.`);
    setUploading(false);
    // Refresh docs list after upload
    fetchDocs();
  };

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* LEFT PANEL — CHAT */}
      <div className="flex flex-col flex-1 h-full">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white shadow">
              <IconSparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">RootCopilot — Global Copilot</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Ask anything about your indexed docs, logs, configs, or knowledge base.
              </p>
            </div>
          </div>
        </div>

        {/* CHAT SCROLL AREA */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm text-center max-w-sm mx-auto">
              Try asking:  
              <br />
              <span className="font-medium">
                &ldquo;Summarize all PSP configuration docs related to UAT.&rdquo;
              </span>
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

          {isLoading && <TypingBubble />}

          {sources.length > 0 && (
            <div className="mt-4 space-y-1">
              <h3 className="text-xs font-semibold text-neutral-500">Sources</h3>
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="text-xs border border-blue-200 dark:border-blue-900 rounded p-2 bg-blue-50 dark:bg-blue-950/40"
                >
                  <strong>{s.doc?.name ?? "Unknown"}</strong>
                  <br />
                  <span className="opacity-70">
                    {s.doc?.namespace ? `${s.doc.namespace}` : "global"} • score{" "}
                    {s.score.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COMPOSER */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 md:px-8 py-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="max-w-3xl mx-auto flex items-end gap-3"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 resize-none rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ask RootCopilot…"
            />

            <button
              disabled={!input.trim() || isLoading}
              className="rounded-full p-3 bg-blue-600 text-white shadow hover:bg-blue-500 transition disabled:opacity-40"
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

      {/* RIGHT PANEL — RAG INDEX */}
      <aside className="hidden lg:flex w-80 xl:w-96 border-l border-neutral-200 dark:border-neutral-800 flex-col h-full bg-neutral-50/60 dark:bg-neutral-950/60">
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <IconBook2 className="h-4 w-4 text-neutral-500" />
          <h2 className="text-xs font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-300">
            Indexed Knowledge
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">

          {/* Upload Section */}
          <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <IconUpload className="h-4 w-4" />
              <p className="text-[11px] font-semibold">Add Context</p>
            </div>

            <p className="text-[11px] text-neutral-500 flex items-start gap-1">
              <IconInfoCircle className="h-3 w-3 mt-[2px]" />
              Upload documents, text files, or code files
            </p>

            <input
              type="text"
              className="w-full rounded border bg-transparent px-2 py-1 text-[11px] border-neutral-300 dark:border-neutral-700"
              placeholder="Namespace (optional)"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            />

            <label className="cursor-pointer border border-dashed rounded px-3 py-3 text-[11px] text-center hover:border-blue-500 transition block">
              Upload files
              <input
                type="file"
                multiple
                className="hidden"
                accept="*/*"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            {uploading && <p className="text-blue-600">Indexing…</p>}
            {uploadStatus && <p className="text-green-600">{uploadStatus}</p>}
          </section>

          {/* Recent Docs */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold">Indexed Entries</p>
              <button
                onClick={fetchDocs}
                disabled={loadingDocs}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
              >
                <IconRefresh className={`h-3 w-3 ${loadingDocs ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="space-y-1">
              {docs.map((d) => (
                <div
                  key={d.entryId}
                  className="rounded border border-neutral-200 dark:border-neutral-800 px-2 py-1"
                >
                  <div className="text-[11px] font-medium">{d.title ?? "Untitled"}</div>
                  <div className="text-[10px] text-neutral-500">
                    {d.namespace ?? "global"} •{" "}
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
              {docs.length === 0 && !loadingDocs && (
                <p className="text-neutral-500 text-[11px]">No entries yet</p>
              )}
              {loadingDocs && (
                <p className="text-neutral-500 text-[11px]">Loading...</p>
              )}
            </div>
          </section>

          {/* Sources */}
          {sources.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold mb-1">Sources from last answer</p>
              {sources.map((s, i) => (
                <div
                  key={i}
                  className="rounded border border-blue-200 dark:border-blue-900 px-2 py-1 bg-blue-50 dark:bg-blue-950/40"
                >
                  <div className="text-[11px] font-medium">{s.doc?.name ?? "Unknown"}</div>
                  <div className="text-[10px] text-neutral-500">
                    {s.doc?.namespace ?? "global"} •{" "}
                    score {s.score.toFixed(3)}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
