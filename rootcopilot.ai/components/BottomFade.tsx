// components/BottomFade.tsx
"use client";

export default function BottomFade() {
  return (
    <div
      className="
        pointer-events-none
        absolute bottom-0 left-0 right-0
        h-16
        bg-gradient-to-t
        from-neutral-900/95 dark:from-neutral-900/95
        to-transparent
        z-10
      "
    />
  );
}
