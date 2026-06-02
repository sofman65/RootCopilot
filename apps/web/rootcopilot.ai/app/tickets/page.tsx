"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconTicket,
  IconChevronRight,
  IconSearch,
  IconFilterX,
} from "@tabler/icons-react";

import {
  type Ticket,
  type TicketListFilter,
  listTickets,
} from "@/lib/rootcopilot-api";
import {
  Badge,
  priorityTone,
  statusTone,
  sourceTone,
} from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const ENVIRONMENTS = ["UAT", "Production", "SIT"];

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [environment, setEnvironment] = useState("");

  // Debounce search input (300ms — same pattern as /search page)
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const filter: TicketListFilter = useMemo(
    () => ({
      q: search || undefined,
      status: status || undefined,
      priority: priority || undefined,
      environment: environment || undefined,
    }),
    [search, status, priority, environment],
  );

  useEffect(() => {
    let cancelled = false;
    setTickets(null);
    setError(null);
    listTickets(filter)
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load tickets");
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const hasActiveFilter = !!(search || status || priority || environment);
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriority("");
    setEnvironment("");
  };

  const breadcrumb = (t: Ticket) =>
    [t.client_name, t.component, t.environment].filter(Boolean).join(" / ");

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header + filter bar */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur px-6 py-4 space-y-3">
        <div className="mx-auto max-w-5xl flex items-center gap-2">
          <IconTicket className="h-5 w-5 text-neutral-500" />
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Tickets
          </h1>
          {tickets && (
            <span className="ml-1 text-xs text-neutral-500">{tickets.length} total</span>
          )}
        </div>

        <div className="mx-auto max-w-5xl flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-50 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5">
            <IconSearch className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tickets…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
          </div>
          <FilterSelect label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
          <FilterSelect
            label="Environment"
            value={environment}
            onChange={setEnvironment}
            options={ENVIRONMENTS}
          />
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <IconFilterX className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-2">
          {error && <ErrorBanner message={error} />}

          {tickets === null && !error && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tickets?.length === 0 &&
            (hasActiveFilter ? (
              <EmptyState
                icon={<IconFilterX className="h-8 w-8" />}
                title="No tickets match these filters"
                description="Try removing some filters or searching for something else."
                action={
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <EmptyState
                icon={<IconTicket className="h-8 w-8" />}
                title="No tickets yet"
                description="Create a ticket or connect an integration to see something here."
              />
            ))}

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
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge tone={sourceTone(t.source_system)}>{t.source_system}</Badge>
                  <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
