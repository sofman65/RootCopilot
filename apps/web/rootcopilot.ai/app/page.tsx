"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconTicket,
  IconAlertOctagon,
  IconActivity,
  IconHeartbeat,
  IconArrowRight,
  IconChevronRight,
} from "@tabler/icons-react";

import {
  type Ticket,
  type LLMMetrics,
  type LLMHealth,
  listTickets,
  getLLMMetrics,
  getLLMHealth,
} from "@/lib/rootcopilot-api";
import { Badge, priorityTone, statusTone } from "@/components/ui/Badge";
import { MetricCard, type StateDot } from "@/components/ui/MetricCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";

const HEALTH_DOT: Record<LLMHealth["status"], StateDot> = {
  healthy: "green",
  degraded: "amber",
  unhealthy: "red",
};

export default function DashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LLMMetrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [health, setHealth] = useState<LLMHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    listTickets()
      .then(setTickets)
      .catch((e) => setTicketsError(e.message ?? "Failed to load tickets"));
    getLLMMetrics()
      .then(setMetrics)
      .catch((e) => setMetricsError(e.message ?? "Failed to load metrics"));
    getLLMHealth()
      .then(setHealth)
      .catch((e) => setHealthError(e.message ?? "Failed to load LLM status"));
  }, []);

  const total = tickets?.length;
  const openCritical = tickets?.filter(
    (t) => t.status === "Open" && t.priority === "Critical",
  ).length;

  const recent = (tickets ?? [])
    .slice()
    .sort((a, b) => {
      const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
      const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
      return tb - ta;
    })
    .slice(0, 5);

  const anyApiError = ticketsError || metricsError || healthError;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            RootCopilot
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Turns engineering tickets into root-cause intelligence.
          </p>
        </div>

        {/* Single banner if the backend is fully unreachable */}
        {ticketsError && metricsError && healthError && (
          <ErrorBanner message="Cannot reach the API. Is the backend running on port 8000?" />
        )}

        {/* Metric grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Tickets"
            icon={<IconTicket className="h-4 w-4" />}
            value={ticketsError ? "—" : total}
            loading={tickets === null && !ticketsError}
          />
          <MetricCard
            label="Open / Critical"
            icon={<IconAlertOctagon className="h-4 w-4" />}
            value={ticketsError ? "—" : openCritical}
            sublabel={
              openCritical !== undefined && openCritical > 0
                ? "Needs attention"
                : openCritical === 0
                  ? "All clear"
                  : undefined
            }
            stateDot={
              openCritical !== undefined ? (openCritical > 0 ? "red" : "green") : undefined
            }
            loading={tickets === null && !ticketsError}
          />
          <MetricCard
            label="Analyses Run"
            icon={<IconActivity className="h-4 w-4" />}
            value={metricsError ? "—" : metrics?.total_requests ?? 0}
            sublabel={metrics ? `${metrics.cache_hit_rate} cache hit rate` : undefined}
            loading={metrics === null && !metricsError}
          />
          <MetricCard
            label="LLM Status"
            icon={<IconHeartbeat className="h-4 w-4" />}
            value={healthError ? "Unreachable" : health ? capitalize(health.status) : "—"}
            sublabel={health?.environment}
            stateDot={
              healthError
                ? "red"
                : health
                  ? HEALTH_DOT[health.status]
                  : undefined
            }
            loading={health === null && !healthError}
          />
        </div>

        {/* Partial error banner — only show when SOME but not ALL failed */}
        {anyApiError && !(ticketsError && metricsError && healthError) && (
          <ErrorBanner message="Some metrics failed to load. Showing what we have." />
        )}

        {/* Recent Tickets */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Recent Tickets
            </h2>
            <Link
              href="/tickets"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View all
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {tickets === null && !ticketsError && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          )}

          {tickets && recent.length === 0 && (
            <EmptyState
              icon={<IconTicket className="h-8 w-8" />}
              title="No tickets yet"
              description="Create a ticket or connect an integration to see something here."
            />
          )}

          {recent.length > 0 && (
            <div className="space-y-2">
              {recent.map((t) => (
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
                        {[t.client_name, t.component, t.environment].filter(Boolean).join(" / ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                      <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                      <IconChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
