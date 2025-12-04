"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "centered" | "inline" | "card" | "page";
  className?: string;
}

/**
 * Reusable loading skeleton component.
 * Variants:
 * - centered: Full-height centered loading indicator (default)
 * - inline: Simple inline skeleton
 * - card: Card-style skeleton
 * - page: Full-page dark loading screen
 */
export function LoadingSkeleton({ variant = "centered", className }: LoadingSkeletonProps) {
  if (variant === "page") {
    return (
      <div className={cn(
        "min-h-screen w-full flex items-center justify-center bg-neutral-950",
        className
      )}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-800" />
          <div className="w-32 h-4 rounded bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (variant === "centered") {
    return (
      <div className={cn(
        "flex h-full w-full items-center justify-center",
        className
      )}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="w-32 h-4 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-700",
        className
      )} />
    );
  }

  // inline
  return (
    <div className={cn(
      "animate-pulse rounded bg-neutral-200 dark:bg-neutral-800",
      className
    )} />
  );
}

/**
 * Message skeleton for chat interfaces
 */
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export default LoadingSkeleton;

