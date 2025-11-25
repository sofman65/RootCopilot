"use client";

import { IconChevronRight } from "@tabler/icons-react";
import React from "react";

type TreeRowProps = {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
};

export default function TreeRow({ label, icon, expanded, onToggle }: TreeRowProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm font-medium"
    >
      {icon}
      <span className="flex-1 text-left truncate">{label}</span>
      <IconChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
    </button>
  );
}
