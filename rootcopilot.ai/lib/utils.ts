import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function groupMessages<T extends { role: string; created_at?: number; timestamp?: number }>(messages: T[]) {
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];

    const isFirst = !prev || prev.role !== msg.role;
    const isLast = !next || next.role !== msg.role;

    return { ...msg, isFirst, isLast };
  });
}
