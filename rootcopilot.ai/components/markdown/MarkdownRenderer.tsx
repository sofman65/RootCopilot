"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";

import CodeBlock from "../markdown/codeblock";

// --- Semantic Detection Keywords ---
const CALLOUT_MAP = [
  {
    keys: ["root cause", "原因", "underlying issue"],
    icon: "🔍",
    label: "Root Cause",
    class: "border-yellow-500 bg-yellow-500/10 text-yellow-200",
  },
  {
    keys: ["fix", "resolution", "solve", "repair"],
    icon: "🛠",
    label: "Fix",
    class: "border-green-500 bg-green-500/10 text-green-200",
  },
  {
    keys: ["warning", "caution", "risk", "be careful"],
    icon: "⚠️",
    label: "Warning",
    class: "border-orange-500 bg-orange-500/10 text-orange-200",
  },
  {
    keys: ["error", "exception", "stacktrace", "crash"],
    icon: "❗",
    label: "Error",
    class: "border-red-500 bg-red-500/10 text-red-200",
  },
  {
    keys: ["how to use", "instructions", "steps", "usage"],
    icon: "📘",
    label: "How to Use",
    class: "border-blue-500 bg-blue-500/10 text-blue-200",
  },
  {
    keys: ["tip", "pro tip", "hint", "recommendation"],
    icon: "💡",
    label: "Tip",
    class: "border-cyan-500 bg-cyan-500/10 text-cyan-200",
  },
  {
    keys: ["next steps", "follow up", "todo"],
    icon: "📌",
    label: "Next Steps",
    class: "border-purple-500 bg-purple-500/10 text-purple-200",
  },
];

// Match semantic type based on heading or sentence
function detectCallout(text: string) {
  const normalized = text.toLowerCase().trim();

  for (const type of CALLOUT_MAP) {
    if (type.keys.some((k) => normalized.startsWith(k))) {
      return type;
    }
  }
  return null;
}

// Callout box component
function Callout({ type, children }: { type: { keys: string[], icon: string, label: string, class: string }, children: React.ReactNode }) {
  return (
    <div
      className={`
        my-4 p-4 rounded-lg border
        ${type.class}
      `}
    >
      <div className="font-semibold text-sm mb-2 flex items-center gap-2">
        <span>{type.icon}</span> {type.label}
      </div>
      <div className="text-[0.9rem] opacity-90 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div
      className={`
        prose prose-neutral dark:prose-invert max-w-none
        prose-p:leading-relaxed prose-li:my-1
      `}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
            return <CodeBlock inline={inline ?? false} className={className ?? ''} {...props}>{children}</CodeBlock>;
          },

          h2({ children }) {
            const text = String(children);
            const type = detectCallout(text);
            if (type) {
              return <Callout type={type}>{text}</Callout>;
            }
            return <h2 className="mt-6 mb-3 text-xl font-semibold">{children}</h2>;
          },

          p({ children }) {
            const text = String(children);
            const type = detectCallout(text);
            if (type) return <Callout type={type}>{children}</Callout>;
            return <p className="mb-3">{children}</p>;
          },

          blockquote({ children }) {
            const text = String(children);
            const type = detectCallout(text);
            if (type) return <Callout type={type}>{children}</Callout>;
            return (
              <blockquote className="border-l-4 border-neutral-500 pl-4 italic opacity-80">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
