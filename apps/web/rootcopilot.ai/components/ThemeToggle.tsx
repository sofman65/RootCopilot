"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { IconMoon, IconSun, IconDeviceLaptop } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const options = [
  { value: "light", label: "Light", icon: <IconSun className="h-4 w-4" /> },
  { value: "dark", label: "Dark", icon: <IconMoon className="h-4 w-4" /> },
  { value: "system", label: "System", icon: <IconDeviceLaptop className="h-4 w-4" /> },
] as const;

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const current = mounted ? resolvedTheme ?? theme : "system";
  const currentIcon =
    current === "light" ? <IconSun className="h-5 w-5" /> :
    current === "dark" ? <IconMoon className="h-5 w-5" /> :
    <IconDeviceLaptop className="h-5 w-5" />;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          "flex items-center gap-3 w-full py-2.5 rounded-lg transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
          open ? "px-3 justify-start" : "px-0 justify-center"
        )}
      >
        {currentIcon}
        <span className={cn("text-left whitespace-pre", !open && "hidden")}>Theme</span>
      </button>

      {menuOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg",
            "dark:border-neutral-700 dark:bg-neutral-900",
            open ? "left-0" : "left-full ml-2"
          )}
        >
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  setMenuOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  current === opt.value ? "font-semibold text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-200"
                )}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
