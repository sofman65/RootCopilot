"use client";

import { cn } from "@/lib/utils";

interface SendButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Reusable send button with paper plane icon.
 * Used across chat interfaces.
 */
export function SendButton({ 
  disabled, 
  onClick, 
  type = "submit",
  size = "md",
  className 
}: SendButtonProps) {
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full bg-blue-600 text-white shadow",
        "hover:bg-blue-500 transition disabled:opacity-50",
        sizeClasses[size],
        className
      )}
    >
      <SendIcon className={cn(iconSizes[size], "rotate-45")} />
    </button>
  );
}

/**
 * Paper plane / send icon SVG component
 */
export function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeWidth={2} d="M5 12l14-7-7 14-2-5-5-2z" />
    </svg>
  );
}

export default SendButton;

