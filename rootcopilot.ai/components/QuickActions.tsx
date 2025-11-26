"use client";

import { motion } from "motion/react";
import { IconBolt, IconNotes, IconTools, IconListCheck, IconBug } from "@tabler/icons-react";

export default function QuickActions({ onAction }: { onAction: (prompt: string) => void }) {
  const actions = [
    {
      label: "Summarize Issue",
      icon: <IconNotes className="h-4 w-4" />,
      prompt: "Summarize the issue clearly and concisely.",
    },
    {
      label: "Propose Fix",
      icon: <IconTools className="h-4 w-4" />,
      prompt: "Propose a fix for this issue. Include steps and code if possible.",
    },
    {
      label: "Check Logs",
      icon: <IconListCheck className="h-4 w-4" />,
      prompt: "Scan known logs or suggest what logs to check for this issue.",
    },
    {
      label: "Root Cause",
      icon: <IconBug className="h-4 w-4" />,
      prompt: "Explain the potential root cause of this issue.",
    },
    {
      label: "Next Steps",
      icon: <IconBolt className="h-4 w-4" />,
      prompt: "What next steps should be taken to resolve this issue?",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={() => onAction(a.prompt)}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </motion.div>
  );
}
