"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IconSearch, IconMessages } from "@tabler/icons-react";

export default function SearchPage() {
  const [term, setTerm] = React.useState("");
  const router = useRouter();
  const results = useQuery(api.search.searchEverything, term.trim() ? { term } : "skip");

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
            value={term}
            onChange={(e) => setTerm(e.target.value)}
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
            {results?.issues.map((i) => (
              <button
                key={i._id}
                onClick={() => onOpenIssue(i._id)}
                className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {i.title}
                </div>
                <div className="text-xs text-neutral-500">
                  {i.environment} • #{String(i._id).slice(-6)}
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
            {results?.messages.map((m) => (
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
                    {m.content}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {m.issue_title ?? "Unknown issue"} • {m.environment} • #{m.issue_id ? String(m.issue_id).slice(-6) : "—"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
