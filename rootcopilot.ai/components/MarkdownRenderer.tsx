"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

import "highlight.js/styles/atom-one-dark.css"; // Dark-mode friendly theme

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div
      className="
        prose prose-neutral dark:prose-invert max-w-none 
        prose-pre:bg-[#0d1117] prose-pre:text-neutral-200
        prose-code:before:hidden prose-code:after:hidden
        prose-img:rounded-xl
      "
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code(CodeProps) {
            const { inline, className, children, ...props } = CodeProps;

            const match = /language-(\w+)/.exec(className || "");
            const [copied, setCopied] = useState(false);

            if (inline) {
              return (
                <code
                  className="rounded bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeText = String(children).trim();

            const handleCopy = async () => {
              await navigator.clipboard.writeText(codeText);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            };

            return (
              <div className="relative group my-4">
                <button
                  onClick={handleCopy}
                  className="
                    absolute right-3 top-3 opacity-0 group-hover:opacity-100 
                    transition-opacity text-xs rounded-md px-2 py-1
                    bg-neutral-700 text-white dark:bg-neutral-600
                    hover:bg-neutral-600 dark:hover:bg-neutral-500
                  "
                >
                  {copied ? "Copied!" : "Copy"}
                </button>

                <pre
                  className="
                    rounded-lg bg-[#0d1117] p-4 overflow-x-auto border border-neutral-800
                  "
                >
                  <code className={match ? className : ""} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-neutral-600 dark:text-neutral-300">
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
