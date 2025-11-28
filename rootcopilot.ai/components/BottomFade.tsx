export default function BottomFade() {
  return (
    <div
      className="
        pointer-events-none
        fixed bottom-24 left-[300px] right-0   /* adjust for sidebar */
        h-24
        bg-gradient-to-t 
        from-white/90 dark:from-neutral-900/90 
        to-transparent
        z-20
      "
    />
  );
}
