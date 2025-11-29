"use client";

import { motion } from "motion/react";
import { useSidebar } from "@/components/ui/sidebar";

export default function RootContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open } = useSidebar();

  return (
    <motion.div
      animate={{
        paddingLeft: open ? 300 : 100,
      }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
      className="h-full w-full overflow-hidden flex flex-col" // <-- FIXED
    >
      {children}
    </motion.div>
  );
}
