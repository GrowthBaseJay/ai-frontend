"use client";

import React, { useState, type ReactNode, isValidElement } from "react";

type CodeBlockProps = {
  children: ReactNode;
  className?: string;
};

/** Safely convert a ReactNode tree into plain text for clipboard copy. */
function toPlainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlainText).join("");
  // Narrow the element type so TS knows `props.children` exists.
  if (isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: ReactNode }>;
    return toPlainText(el.props?.children);
  }
  return "";
}

export default function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = toPlainText(children);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="relative rounded-xl border border-[color:var(--gb-border)]/80 bg-[color:var(--gb-surface-2)]">
      <button
        onClick={copy}
        className="absolute right-2 top-2 rounded-md border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface)] px-2 py-1 text-xs text-[color:var(--gb-subtle)] hover:text-[color:var(--gb-text)]"
        aria-label="Copy code"
        title="Copy"
        type="button"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-3">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}