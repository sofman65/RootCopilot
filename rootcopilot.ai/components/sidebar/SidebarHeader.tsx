"use client";

import { motion } from "motion/react";
import Brand from "@/components/shared/Brand";
import { useSidebar } from "@/components/ui/sidebar";

function LogoExpanded() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Brand
        href="/"
        withText
        size={26}
        className="px-2 text-neutral-900 dark:text-neutral-100"
        textClassName="text-sm text-neutral-900 dark:text-neutral-100"
      />
    </motion.div>
  );
}

function LogoCollapsed() {
  return (
    <Brand
      href="/"
      size={22}
      className="px-1 text-neutral-900 dark:text-neutral-100"
    />
  );
}

export default function SidebarHeader() {
  const { open } = useSidebar();
  return open ? <LogoExpanded /> : <LogoCollapsed />;
}
