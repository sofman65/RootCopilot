"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconSparkles,
  IconLoader2,
  IconAlertCircle,
  IconCircleCheck,
  IconBulb,
  IconListCheck,
  IconUsers,
  IconLink,
} from "@tabler/icons-react";
import {
  type Ticket,
  type AnalysisRun,
  getTicket,
  getTicketAnalysis,
  analyzeTicket,
} from "@/lib/rootcopilot-api";

// ---------------------------------------------------------------------------
// Badge primitives
// ---------------------------------------------------------------------------

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

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  low: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function Badge({ text, colorClass }: { text: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colorClass}`}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function TicketSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
      <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
      <div className="space-y-2 mt-4">
        <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-5/6 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-3 w-4/6 rounded bg-neutral-200 dark:bg-neutral-700" />
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-4/5 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analysis card
// ---------------------------------------------------------------------------

function AnalysisCard({ run }: { run: AnalysisRun }) {
  const rj = run.result_json;
  const router = useRouter();

  if (!rj) return null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <IconSparkles className="h-4 w-4 text-indigo-500" />
          AI Analysis
        </div>
        <Badge
          text={`Confidence: ${rj.confidence}`}
          colorClass={CONFIDENCE_COLORS[rj.confidence] ?? "bg-neutral-100 text-neutral-600"}
        />
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {/* Summary */}
        <Section icon={<IconCircleCheck className="h-4 w-4 text-neutral-500" />} label="Summary">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{rj.summary}</p>
        </Section>

        {/* Root cause */}
        <Section icon={<IconAlertCircle className="h-4 w-4 text-orange-500" />} label="Likely Root Cause">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{rj.likely_root_cause}</p>
        </Section>

        {/* Evidence */}
        {rj.evidence.length > 0 && (
          <Section icon={<IconBulb className="h-4 w-4 text-yellow-500" />} label="Evidence">
            <ul className="space-y-1">
              {rj.evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="mt-0.5 text-neutral-400">•</span>
                  {e}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Suggested steps */}
        {rj.suggested_steps.length > 0 && (
          <Section icon={<IconListCheck className="h-4 w-4 text-indigo-500" />} label="Suggested Steps">
            <ol className="space-y-1.5">
              {rj.suggested_steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Stakeholder summary */}
        <Section icon={<IconUsers className="h-4 w-4 text-neutral-500" />} label="Stakeholder Summary">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
            &ldquo;{rj.stakeholder_summary}&rdquo;
          </p>
        </Section>

        {/* Similar tickets */}
        {run.similar_tickets.length > 0 && (
          <Section icon={<IconLink className="h-4 w-4 text-neutral-500" />} label="Similar Tickets">
            <div className="space-y-2">
              {run.similar_tickets.map((s) => (
                <button
                  key={s.ticket_id}
                  onClick={() => router.push(`/tickets/${s.ticket_id}`)}
                  className="w-full text-left rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {s.title}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500">
                      {Math.round(s.score * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{s.explanation}</p>
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Load ticket
  useEffect(() => {
    getTicket(ticketId)
      .then(setTicket)
      .catch((e) => setTicketError(e.message ?? "Ticket not found"));
  }, [ticketId]);

  // Load existing analysis
  useEffect(() => {
    setAnalysisLoading(true);
    getTicketAnalysis(ticketId)
      .then(setAnalysis)
      .catch(() => setAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [ticketId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const run = await analyzeTicket(ticketId);
      setAnalysis(run);
    } catch (e: unknown) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const breadcrumb = ticket
    ? [ticket.client_name, ticket.component, ticket.environment].filter(Boolean).join(" / ")
    : null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur px-6 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <button
            onClick={() => router.push("/tickets")}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
          >
            <IconArrowLeft className="h-4 w-4" />
            Tickets
          </button>
          {ticket && (
            <>
              <span className="text-neutral-300 dark:text-neutral-600">/</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-xs">
                {ticket.title}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Ticket not found error */}
          {ticketError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {ticketError}
            </div>
          )}

          {/* Ticket header skeleton */}
          {!ticket && !ticketError && <TicketSkeleton />}

          {/* Ticket header */}
          {ticket && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                {ticket.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  text={ticket.priority}
                  colorClass={PRIORITY_COLORS[ticket.priority] ?? "bg-neutral-100 text-neutral-600"}
                />
                <Badge
                  text={ticket.status}
                  colorClass={STATUS_COLORS[ticket.status] ?? "bg-neutral-100 text-neutral-600"}
                />
              </div>

              {breadcrumb && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{breadcrumb}</p>
              )}

              {ticket.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ticket.labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {ticket?.description && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                Description
              </h2>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Metadata row */}
          {ticket && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Source", value: ticket.source_system },
                { label: "Service", value: ticket.service_name },
                { label: "Assignee", value: ticket.assignee },
                { label: "Reporter", value: ticket.reporter },
              ].map(({ label, value }) =>
                value ? (
                  <div
                    key={label}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-0.5">
                      {label}
                    </div>
                    <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {value}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Divider */}
          {ticket && (
            <div className="border-t border-neutral-200 dark:border-neutral-700" />
          )}

          {/* Analysis section */}
          {ticket && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <IconSparkles className="h-4 w-4 text-indigo-500" />
                  AI Analysis
                </h2>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-white transition"
                >
                  {analyzing ? (
                    <>
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                      Analyzing…
                    </>
                  ) : analysis ? (
                    <>
                      <IconSparkles className="h-3.5 w-3.5" />
                      Re-analyze
                    </>
                  ) : (
                    <>
                      <IconSparkles className="h-3.5 w-3.5" />
                      Analyze ticket
                    </>
                  )}
                </button>
              </div>

              {analyzeError && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {analyzeError}
                </div>
              )}

              {analysisLoading && !analysis && <AnalysisSkeleton />}

              {!analysisLoading && !analysis && !analyzeError && (
                <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-5 py-8 text-center">
                  <IconSparkles className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-sm text-neutral-500">
                    No analysis yet. Click &ldquo;Analyze ticket&rdquo; to get AI insights.
                  </p>
                </div>
              )}

              {analysis && <AnalysisCard run={analysis} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
