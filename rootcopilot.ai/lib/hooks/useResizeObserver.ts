"use client";

import { useEffect, useLayoutEffect, useRef, useState, RefObject } from "react";

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface Size {
  width: number;
  height: number;
}

/**
 * Hook for observing element size changes.
 * 
 * @param ref - Ref to the element to observe (optional if you want to use the returned ref)
 * @returns Object with ref, width, and height
 * 
 * @example
 * ```tsx
 * const { ref, height } = useResizeObserver<HTMLDivElement>();
 * 
 * return (
 *   <>
 *     <div ref={ref}>Content</div>
 *     <p>Height: {height}px</p>
 *   </>
 * );
 * ```
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T>
): { ref: RefObject<T>; width: number; height: number } {
  const internalRef = useRef<T>(null);
  const ref = externalRef ?? internalRef;
  
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
    };

    // Initial measurement
    updateSize();

    // Observe changes
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return {
    ref: ref as RefObject<T>,
    ...size,
  };
}

/**
 * Simpler hook that just returns the height.
 * Useful for header/footer measurements.
 */
export function useElementHeight<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T>
): { ref: RefObject<T>; height: number } {
  const { ref, height } = useResizeObserver<T>(externalRef);
  return { ref, height };
}

export default useResizeObserver;

