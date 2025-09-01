"use client";

import { useState } from "react";

export default function CodeBlock({ children, className }: { children: any; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = typeof children === "string" ? children : String(children?.props?.children ?? "");

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="relative rounded-xl border border-[color:var(--gb-border)]/80 bg-[color:var(--gb-surface-2)]">
      <button
        onClick={copy}
        className="absolute right-2 top-2 rounded-md border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface)] px-2 py-1 text-xs text-[color:var(--gb-subtle)] hover:text-[color:var(--gb-text)]"
        aria-label="Copy code"
        title="Copy"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-3"><code className={className}>{children}</code></pre>
    </div>
  );
}