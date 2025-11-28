"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconArrowDown } from "@tabler/icons-react";

export default function ScrollToBottomButton({
  onClick,
  show,
}: {
  onClick: () => void;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          onClick={onClick}
          className="
            fixed bottom-28 right-6 z-20 
            rounded-full p-3 
            bg-white dark:bg-neutral-800 
            shadow-lg border border-neutral-200 dark:border-neutral-700  
            hover:scale-110 active:scale-95 
            transition-all
          "
        >
          <IconArrowDown className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
