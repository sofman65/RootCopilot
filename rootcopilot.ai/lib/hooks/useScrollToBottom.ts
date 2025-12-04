"use client";

import { useCallback, useEffect, useRef, useState, RefObject } from "react";

interface UseScrollToBottomOptions {
  /** Threshold in pixels to consider "near bottom" (default: 120) */
  threshold?: number;
  /** Dependencies that trigger auto-scroll when changed */
  dependencies?: unknown[];
}

interface UseScrollToBottomReturn {
  /** Ref to attach to the scrollable container */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Whether to show the "scroll to bottom" button */
  showScrollButton: boolean;
  /** Function to scroll to bottom */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  /** Check if user is near the bottom */
  isNearBottom: () => boolean;
  /** Manually update the scroll button visibility */
  updateScrollButton: () => void;
}

/**
 * Hook for managing scroll-to-bottom functionality in chat-like interfaces.
 * 
 * @example
 * ```tsx
 * const { scrollRef, showScrollButton, scrollToBottom } = useScrollToBottom({
 *   dependencies: [messages]
 * });
 * 
 * return (
 *   <div ref={scrollRef} className="overflow-y-auto">
 *     {messages.map(...)}
 *     {showScrollButton && <ScrollButton onClick={() => scrollToBottom("smooth")} />}
 *   </div>
 * );
 * ```
 */
export function useScrollToBottom(
  options: UseScrollToBottomOptions = {}
): UseScrollToBottomReturn {
  const { threshold = 120, dependencies = [] } = options;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    
    el.scrollTo({
      top: el.scrollHeight,
      behavior,
    });
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return false;
    
    return el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
  }, [threshold]);

  const updateScrollButton = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
    setShowScrollButton(!atBottom);
  }, []);

  // Auto-scroll when dependencies change and user is near bottom
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (isNearBottom()) {
        scrollToBottom("smooth");
      }
      updateScrollButton();
    });

    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  // Listen for scroll events to update button visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollButton);
    updateScrollButton(); // Initial check

    return () => el.removeEventListener("scroll", updateScrollButton);
  }, [updateScrollButton]);

  return {
    scrollRef,
    showScrollButton,
    scrollToBottom,
    isNearBottom,
    updateScrollButton,
  };
}

export default useScrollToBottom;

