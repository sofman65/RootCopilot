"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconTicket, IconChevronRight } from "@tabler/icons-react";
import { type Ticket, listTickets } from "@/lib/rootcopilot-api";

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "In Progress": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  Resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  Closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function Badge({ text, colorClass }: { text: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
      {text}
    </span>
  );
}

function TicketRowSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .catch((e) => setError(e.message ?? "Failed to load tickets"));
  }, []);

  const breadcrumb = (t: Ticket) =>
    [t.client_name, t.component, t.environment].filter(Boolean).join(" / ");

  return (
    <div className="flex h-full w-full flex-col">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-2">
          <IconTicket className="h-5 w-5 text-neutral-500" />
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Tickets
          </h1>
          {tickets && (
            <span className="ml-1 text-xs text-neutral-500">
              {tickets.length} total
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-2">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {tickets === null && !error && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <TicketRowSkeleton key={i} />
              ))}
            </>
          )}

          {tickets?.length === 0 && (
            <div className="text-sm text-neutral-500 py-8 text-center">
              No tickets yet.
            </div>
          )}

          {tickets?.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/tickets/${t.id}`)}
              className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {t.title}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {breadcrumb(t) || t.project_id}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    text={t.priority}
                    colorClass={PRIORITY_COLORS[t.priority] ?? "bg-neutral-100 text-neutral-600"}
                  />
                  <Badge
                    text={t.status}
                    colorClass={STATUS_COLORS[t.status] ?? "bg-neutral-100 text-neutral-600"}
                  />
                  <IconChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
