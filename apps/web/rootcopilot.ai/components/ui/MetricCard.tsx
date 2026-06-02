import { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

export type StateDot = "green" | "amber" | "red";

const DOT_CLASSES: Record<StateDot, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function MetricCard({
  label,
  value,
  sublabel,
  icon,
  stateDot,
  loading = false,
}: {
  label: string;
  value?: ReactNode;
  sublabel?: ReactNode;
  icon?: ReactNode;
  stateDot?: StateDot;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
        {icon && <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : (
        <div className="mt-2 flex items-baseline gap-2">
          {stateDot && (
            <span className={`h-2.5 w-2.5 rounded-full ${DOT_CLASSES[stateDot]}`} aria-hidden />
          )}
          <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
        </div>
      )}
      {sublabel && !loading && (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</div>
      )}
    </div>
  );
}
