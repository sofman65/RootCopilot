"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useSidebar } from "@/components/ui/sidebar";

function LogoExpanded() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 text-neutral-900 dark:text-neutral-100">
      <div className="h-6 w-6 rounded-md bg-black dark:bg-white" />
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm">
        rootcopilot.ai
      </motion.span>
    </Link>
  );
}

function LogoCollapsed() {
  return (
    <Link href="/" className="flex items-center justify-center px-1 text-neutral-900 dark:text-neutral-100">
      <div className="h-5 w-5 rounded-md bg-black dark:bg-white" />
    </Link>
  );
}

export default function SidebarHeader() {
  const { open } = useSidebar();
  return open ? <LogoExpanded /> : <LogoCollapsed />;
}
