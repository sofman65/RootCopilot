import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      {icon && (
        <div className="mx-auto mb-3 text-neutral-300 dark:text-neutral-600 flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
