import { ReactNode } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

export function ErrorBanner({
  message,
  action,
  className = "",
}: {
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2 ${className}`}
    >
      <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {action}
    </div>
  );
}
