"use client";

import { useSidebar } from "@/components/ui/sidebar";

export default function SkeletonList({ count, indent = false }: { count: number; indent?: boolean }) {
  const { open } = useSidebar();
  const applyIndent = indent && open;
  return (
    <ul className={applyIndent ? "ml-3" : ""}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="my-1">
          <div className="h-6 w-full rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}
