"use client";

import { motion } from "motion/react";
import { IconRobot } from "@tabler/icons-react";

export default function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full gap-3 p-4 justify-start"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <IconRobot className="h-4 w-4" />
      </div>
      <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  );
}
