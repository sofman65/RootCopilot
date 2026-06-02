import { ReactNode } from "react";

export type Tone =
  // priority
  | "critical"
  | "high"
  | "medium"
  | "low"
  // status
  | "open"
  | "in-progress"
  | "resolved"
  | "closed"
  // confidence (different palette than priority on purpose — green=high)
  | "confidence-high"
  | "confidence-medium"
  | "confidence-low"
  // source system
  | "source-manual"
  | "source-jira"
  | "source-azure_devops"
  // generic
  | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",

  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "in-progress": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",

  "confidence-high": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  "confidence-medium": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  "confidence-low": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",

  "source-manual": "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  "source-jira": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  "source-azure_devops": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",

  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function Badge({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// --- value-to-tone helpers ---

export function priorityTone(priority: string): Tone {
  switch (priority) {
    case "Critical": return "critical";
    case "High": return "high";
    case "Medium": return "medium";
    case "Low": return "low";
    default: return "neutral";
  }
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "Open": return "open";
    case "In Progress": return "in-progress";
    case "Resolved": return "resolved";
    case "Closed": return "closed";
    default: return "neutral";
  }
}

export function confidenceTone(confidence: "high" | "medium" | "low"): Tone {
  return `confidence-${confidence}` as Tone;
}

export function sourceTone(source: string): Tone {
  switch (source) {
    case "manual": return "source-manual";
    case "jira": return "source-jira";
    case "azure_devops": return "source-azure_devops";
    default: return "neutral";
  }
}
