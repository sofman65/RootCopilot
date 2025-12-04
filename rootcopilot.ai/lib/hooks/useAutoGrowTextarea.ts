"use client";

import { useEffect, useRef, RefObject } from "react";

/**
 * Hook for auto-growing textarea based on content.
 * 
 * @param value - The current value of the textarea
 * @returns Ref to attach to the textarea element
 * 
 * @example
 * ```tsx
 * const [value, setValue] = useState("");
 * const textareaRef = useAutoGrowTextarea(value);
 * 
 * return (
 *   <textarea
 *     ref={textareaRef}
 *     value={value}
 *     onChange={(e) => setValue(e.target.value)}
 *   />
 * );
 * ```
 */
export function useAutoGrowTextarea(value: string): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight to fit content
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return ref;
}

export default useAutoGrowTextarea;

