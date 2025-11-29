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
    <motion.main
      animate={{
        marginLeft: open ? 300 : 100, 
      }}
      transition={{
        duration: 0.25,
        ease: "easeInOut",
      }}
      className="flex-1 h-screen flex flex-col overflow-hidden"
    >
      {children}
    </motion.main>
  );
}
