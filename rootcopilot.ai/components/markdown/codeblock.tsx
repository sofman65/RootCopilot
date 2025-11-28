import { useState } from "react";

export default function CodeBlock({
    inline,
    className,  
    children,
    ...props
  }: { inline: boolean, className: string, children: React.ReactNode, props: React.HTMLAttributes<HTMLElement> }) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "code";
    const codeText = String(children).trim();
    const [copied, setCopied] = useState(false);
    const COLLAPSE_LINE_LIMIT = 10;
    // Collapse logic
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
  
        {/* Header */}
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
  
        {/* Code Content */}
        <pre
          className="overflow-x-auto transition-all duration-300"
          style={{ maxHeight: expanded ? "1000px" : "220px" }}
        >
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
  
        {/* Expand/Collapse */}
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
  