"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";
import Image from "next/image";

const COLLAPSE_LINE_LIMIT = 12;

export default function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div
      className={`
        prose prose-neutral dark:prose-invert max-w-none

        prose-h1:text-2xl prose-h1:font-semibold prose-h1:mb-4
        prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-lg prose-h3:font-medium prose-h3:mt-4 prose-h3:mb-2

        prose-ul:my-2 prose-ol:my-2

        prose-code:bg-neutral-200 dark:prose-code:bg-neutral-800
        prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      `}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code: CodeBlock,
          blockquote: CalloutBlock,
          img: ImageBlock,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ inline, className, children, ...props }: any) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";
  const codeText = String(children).trim();
  const [copied, setCopied] = useState(false);

  const lines = codeText.split("\n").length;
  const isLong = lines > COLLAPSE_LINE_LIMIT;
  const [expanded, setExpanded] = useState(!isLong);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

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

  return (
    <div className="relative my-4 rounded-lg border border-neutral-800 bg-[#0d1117] shadow-lg overflow-hidden">
      <div className="flex justify-between items-center px-3 py-1.5 border-b border-neutral-700 bg-neutral-900">
        <span className="text-xs uppercase tracking-wide text-neutral-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <pre
        className="overflow-x-auto transition-all duration-300"
        style={{ maxHeight: expanded ? "1000px" : "220px" }}
      >
        <code className={className} {...props}>
          {children}
        </code>
      </pre>

      {isLong && (
        <div className="flex justify-center border-t border-neutral-800 bg-neutral-900/70">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs py-2 text-neutral-300 hover:text-white transition"
          >
            {expanded ? "Collapse code ▲" : "Expand code ▼"}
          </button>
        </div>
      )}
    </div>
  );
}

function CalloutBlock({ children }: { children: React.ReactNode }) {
  const text = String(children);

  if (text.includes("Tip:"))
    return (
      <div className="my-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded">
        <strong className="text-blue-700 dark:text-blue-300">💡 Tip:</strong>
        <div className="mt-1">{children}</div>
      </div>
    );
    
  if (text.includes("Warning:"))
    return (
      <div className="my-4 p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950 rounded">
        <strong className="text-red-700 dark:text-red-300">⚠️ Warning:</strong>
        <div className="mt-1">{children}</div>
      </div>
    );

  return (
    <blockquote className="border-l-4 border-neutral-400 pl-4 italic text-neutral-600 dark:text-neutral-300">
      {children}
    </blockquote>
  );
}

function ImageBlock({ src, alt }: any) {
  return <Image src={src} alt={alt} className="max-w-full rounded-lg shadow my-4" width={100} height={100}/>;
}
