"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import React from "react";

type TreeRowProps = {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
};

export default function TreeRow({ label, icon, expanded, onToggle }: TreeRowProps) {
  const { open } = useSidebar();
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 w-full py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm font-medium transition-all",
        open ? "px-3 justify-start" : "px-0 justify-center"
      )}
    >
      {icon}
      <span className={cn("flex-1 text-left truncate", !open && "hidden")}>{label}</span>
      <IconChevronRight
        className={cn(
          "h-4 w-4 transition-transform",
          expanded ? "rotate-90" : "",
          !open && "hidden"
        )}
      />
    </button>
  );
}
