"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconSearch, IconMessages } from "@tabler/icons-react";

export default function SearchPage() {
  const [raw, setRaw] = React.useState("");
  const [term, setTerm] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setTerm(raw), 300);
    return () => clearTimeout(id);
  }, [raw]);
  const router = useRouter();
  const results = useQuery(api.search.searchEverything, term.trim() ? { term } : "skip");

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === q.toLowerCase() ? (
        <span key={i} className="bg-yellow-200/70 dark:bg-yellow-500/40 rounded px-0.5">
          {p}
        </span>
      ) : (
        <React.Fragment key={i}>{p}</React.Fragment>
      )
    );
  };

  const onOpenIssue = (issueId?: string) => {
    if (!issueId) return;
    router.push(`/issues/${issueId}/thread`);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur p-4">
        <div className="mx-auto max-w-3xl flex items-center gap-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 shadow-sm">
          <IconSearch className="h-4 w-4 text-neutral-500" />
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Search issues or messages…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500 dark:text-neutral-100"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Issues */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-3">
            Issues
          </h2>
          <div className="space-y-2">
            {!results && term.trim() && (
              <div className="text-sm text-neutral-500">Searching…</div>
            )}
            {results && results.issues.length === 0 && (
              <div className="text-sm text-neutral-500">No issues found.</div>
            )}
            {results?.issues
              .slice()
              .sort((a, b) => b.created_at - a.created_at)
              .map((i) => (
              <button
                key={i._id}
                onClick={() => onOpenIssue(i._id)}
                className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {highlight(i.title, term)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {i.breadcrumb ?? i.environment} • #{String(i._id).slice(-6)}
                  </div>
              </button>
            ))}
          </div>
        </section>

        {/* Messages */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-3">
            Messages
          </h2>
          <div className="space-y-2">
            {!results && term.trim() && (
              <div className="text-sm text-neutral-500">Searching…</div>
            )}
            {results && results.messages.length === 0 && (
              <div className="text-sm text-neutral-500">No messages found.</div>
            )}
            {results?.messages
              .slice()
              .sort((a, b) => b.created_at - a.created_at)
              .map((m) => (
              <button
                key={m._id}
                onClick={() => onOpenIssue(m.issue_id)}
                className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition flex gap-2"
              >
                <div className="mt-1">
                  <IconMessages className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2">
                    {highlight(m.content, term)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {m.breadcrumb ?? m.environment} • {m.issue_title ?? "Unknown issue"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Empty suggestions */}
        {results &&
          results.issues.length === 0 &&
          results.messages.length === 0 &&
          term.trim() && (
            <div className="max-w-3xl mx-auto text-sm text-neutral-500 space-y-2">
              <div>No results found.</div>
              <div className="font-medium text-neutral-700 dark:text-neutral-200">
                Try asking Copilot:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>{`Search payment gateway logs for errors about "${term}"`}</li>
                <li>{`Summarize issue history related to "${term}"`}</li>
                <li>{`What logs should I check for "${term}" failures?`}</li>
              </ul>
            </div>
          )}
      </div>
    </div>
  );
}
