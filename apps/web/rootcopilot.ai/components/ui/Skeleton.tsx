export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse ${className}`} />;
}
