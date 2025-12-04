"use client";

import {
  IconFile,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconPhoto,
  IconCheck,
  IconLoader,
  IconAlertCircle,
  IconClock,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { FileStatus } from "@/convex/lib/types";

interface IconProps {
  className?: string;
}

// ========================
// FILE TYPE ICONS
// ========================

/**
 * Returns appropriate icon based on file name/extension.
 */
export function getFileIcon(name: string, props?: IconProps): React.ReactNode {
  const lower = name.toLowerCase();
  const className = props?.className ?? "h-4 w-4";

  if (lower.endsWith(".pdf")) {
    return <IconFileTypePdf className={className} />;
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return <IconFileTypeDoc className={className} />;
  }
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
    return <IconPhoto className={className} />;
  }
  return <IconFile className={className} />;
}

/**
 * File icon component with automatic detection.
 */
export function FileIcon({ name, className }: { name: string; className?: string }) {
  return <>{getFileIcon(name, { className })}</>;
}

// ========================
// STATUS ICONS
// ========================

interface StatusIconProps {
  status: FileStatus | string;
  className?: string;
}

/**
 * Returns appropriate status icon with colors.
 */
export function getStatusIcon(status: string, props?: IconProps): React.ReactNode {
  const baseClass = props?.className ?? "h-3 w-3";

  switch (status) {
    case "ready":
    case "completed":
    case "resolved":
      return <IconCheck className={cn(baseClass, "text-green-500")} />;
    
    case "processing":
    case "running":
    case "in_progress":
      return <IconLoader className={cn(baseClass, "text-blue-500 animate-spin")} />;
    
    case "error":
    case "failed":
      return <IconAlertCircle className={cn(baseClass, "text-red-500")} />;
    
    case "pending":
    default:
      return <IconClock className={cn(baseClass, "text-neutral-400")} />;
  }
}

/**
 * Status icon component for file/job statuses.
 */
export function StatusIcon({ status, className }: StatusIconProps) {
  return <>{getStatusIcon(status, { className })}</>;
}

// ========================
// STATUS BADGES
// ========================

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  closed: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  low: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  pending: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  ready: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
  error: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  active: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
  expired: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
};

/**
 * Status badge component for displaying status as a pill.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] ?? "bg-neutral-100 text-neutral-600";
  const displayText = status.replace(/_/g, " ");

  return (
    <span className={cn(
      "text-xs px-1.5 py-0.5 rounded-full",
      colorClass,
      className
    )}>
      {displayText}
    </span>
  );
}

export default { FileIcon, StatusIcon, StatusBadge, getFileIcon, getStatusIcon };

