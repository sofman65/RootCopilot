"use client";

import {
  IconSparkles,
  IconAlertCircle,
  IconBulb,
  IconListCheck,
  IconUsers,
  IconCheck,
} from "@tabler/icons-react";

import { type AnalysisRun } from "@/lib/rootcopilot-api";
import { Badge, confidenceTone } from "@/components/ui/Badge";

const CONFIDENCE_DOT: Record<"high" | "medium" | "low", string> = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-red-500",
};

export function AnalysisCard({ analysis }: { analysis: AnalysisRun }) {
  const rj = analysis.result_json;
  if (!rj) return null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Header: title left, confidence pill (with status dot) right */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <IconSparkles className="h-4 w-4 text-indigo-500" />
          AI Analysis
        </div>
        <Badge tone={confidenceTone(rj.confidence)} className="gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${CONFIDENCE_DOT[rj.confidence]}`} aria-hidden />
          {rj.confidence} confidence
        </Badge>
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {/* Summary — small caption above root cause */}
        <div className="px-5 pt-4 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Summary
          </div>
          <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{rj.summary}</p>
        </div>

        {/* Likely Root Cause — visually dominant section */}
        <div className="px-5 py-4 bg-orange-50/40 dark:bg-orange-900/10">
          <div className="flex items-center gap-1.5 mb-2">
            <IconAlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-300">
              Likely Root Cause
            </span>
          </div>
          <p className="text-[15px] leading-relaxed font-medium text-neutral-900 dark:text-neutral-100">
            {rj.likely_root_cause}
          </p>
        </div>

        {/* Evidence — items with leading check icons */}
        {rj.evidence.length > 0 && (
          <Section icon={<IconBulb className="h-4 w-4 text-yellow-500" />} label="Evidence">
            <ul className="space-y-1.5">
              {rj.evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <IconCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Suggested Steps — numbered circles */}
        {rj.suggested_steps.length > 0 && (
          <Section icon={<IconListCheck className="h-4 w-4 text-indigo-500" />} label="Suggested Steps">
            <ol className="space-y-2">
              {rj.suggested_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Stakeholder Summary — blockquote style with left accent */}
        <Section icon={<IconUsers className="h-4 w-4 text-neutral-500" />} label="Stakeholder Summary">
          <blockquote className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-4 italic text-sm text-neutral-700 dark:text-neutral-300">
            &ldquo;{rj.stakeholder_summary}&rdquo;
          </blockquote>
        </Section>
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
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
