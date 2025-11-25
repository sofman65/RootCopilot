"use client";

export default function SkeletonList({ count, indent = false }: { count: number; indent?: boolean }) {
  return (
    <ul className={indent ? "ml-3" : ""}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="my-1">
          <div className="h-6 w-full rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}
