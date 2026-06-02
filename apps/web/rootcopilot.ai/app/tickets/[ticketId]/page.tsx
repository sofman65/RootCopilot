"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconSparkles,
  IconLoader2,
  IconLink,
  IconMessages,
  IconPaperclip,
  IconFileText,
} from "@tabler/icons-react";

import {
  type Ticket,
  type AnalysisRun,
  type Comment,
  type Artifact,
  getTicket,
  getTicketAnalysis,
  analyzeTicket,
  listComments,
  listArtifacts,
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
import { AnalysisCard } from "@/components/tickets/AnalysisCard";


// ===========================================================================
// Main page
// ===========================================================================

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    getTicket(ticketId)
      .then(setTicket)
      .catch((e) => setTicketError(e.message ?? "Ticket not found"));
    listComments(ticketId)
      .then(setComments)
      .catch(() => setComments([]));
    listArtifacts(ticketId)
      .then(setArtifacts)
      .catch(() => setArtifacts([]));
  }, [ticketId]);

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
        <div className="mx-auto max-w-6xl flex items-center gap-3">
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
        <div className="mx-auto max-w-6xl space-y-6">

          {ticketError && <ErrorBanner message={ticketError} />}
          {!ticket && !ticketError && <TicketHeaderSkeleton />}

          {/* Ticket header (full width) */}
          {ticket && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                {ticket.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
                <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                <Badge tone={sourceTone(ticket.source_system)}>{ticket.source_system}</Badge>
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

          {/* Two-column body */}
          {ticket && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT — ticket details, comments, artifacts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                {ticket.description && (
                  <Card>
                    <CardLabel>Description</CardLabel>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {ticket.description}
                    </p>
                  </Card>
                )}

                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Service", value: ticket.service_name },
                    { label: "Assignee", value: ticket.assignee },
                    { label: "Reporter", value: ticket.reporter },
                    { label: "Component", value: ticket.component },
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
                    ) : null,
                  )}
                </div>

                {/* Comments */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <CardLabel className="mb-0 flex items-center gap-1.5">
                      <IconMessages className="h-3.5 w-3.5" />
                      Comments
                    </CardLabel>
                    {comments && comments.length > 0 && (
                      <span className="text-xs text-neutral-500">{comments.length}</span>
                    )}
                  </div>
                  {comments === null ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : comments.length === 0 ? (
                    <EmptyState
                      icon={<IconMessages className="h-6 w-6" />}
                      title="No comments yet"
                      description="Comments imported from the source system will appear here."
                      className="py-6"
                    />
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {c.author}
                            </span>
                            <span className="text-neutral-400">{formatRelative(c.created_at)}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                            {c.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Artifacts */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <CardLabel className="mb-0 flex items-center gap-1.5">
                      <IconPaperclip className="h-3.5 w-3.5" />
                      Artifacts
                    </CardLabel>
                    {artifacts && artifacts.length > 0 && (
                      <span className="text-xs text-neutral-500">{artifacts.length}</span>
                    )}
                  </div>
                  {artifacts === null ? (
                    <Skeleton className="h-12 w-full" />
                  ) : artifacts.length === 0 ? (
                    <EmptyState
                      icon={<IconPaperclip className="h-6 w-6" />}
                      title="No artifacts attached"
                      description="Logs, screenshots, and stack traces will appear here."
                      className="py-6"
                    />
                  ) : (
                    <div className="space-y-2">
                      {artifacts.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-3 py-2"
                        >
                          <IconFileText className="h-4 w-4 text-neutral-400 shrink-0" />
                          <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate flex-1">
                            {a.name}
                          </span>
                          <Badge tone="neutral">{a.type}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* RIGHT — analysis pane */}
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
                        Analyze
                      </>
                    )}
                  </button>
                </div>

                {analyzeError && <ErrorBanner message={analyzeError} />}

                {analysisLoading && !analysis && <AnalysisSkeleton />}

                {!analysisLoading && !analysis && !analyzeError && (
                  <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-5 py-8 text-center">
                    <IconSparkles className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-sm text-neutral-500">
                      No analysis yet. Click &ldquo;Analyze&rdquo; to generate one.
                    </p>
                  </div>
                )}

                {analysis && <AnalysisCard analysis={analysis} />}

                {/* Similar tickets — separate card, below the AnalysisCard */}
                {analysis && analysis.similar_tickets.length > 0 && (
                  <Card>
                    <CardLabel className="flex items-center gap-1.5">
                      <IconLink className="h-3.5 w-3.5" />
                      Similar Tickets
                    </CardLabel>
                    <div className="space-y-2">
                      {analysis.similar_tickets.map((s) => (
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
                          {s.explanation && (
                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                              {s.explanation}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ===========================================================================
// Small presentational helpers
// ===========================================================================

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-5 py-4">
      {children}
    </div>
  );
}

function CardLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 ${className}`}
    >
      {children}
    </h2>
  );
}

function TicketHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
