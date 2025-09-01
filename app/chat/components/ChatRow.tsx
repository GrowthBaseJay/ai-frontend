"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Msg } from "../lib/types";

export default function ChatRow({ msg }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  if (isUser) {
    // allow a bit more width with the new 900px center
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[16px] leading-7 text-[color:var(--gb-text)]">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative w-full">
      <div className="prose prose-invert max-w-none text-[16px] leading-7 text-[color:var(--gb-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {msg.content}
        </ReactMarkdown>
      </div>
      <button
        className="absolute -top-3 -right-2 hidden rounded-md border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface)] px-2 py-1 text-xs text-[color:var(--gb-subtle)] hover:text-[color:var(--gb-text)] group-hover:block"
        onClick={() => navigator.clipboard.writeText(msg.content)}
        aria-label="Copy message"
        title="Copy"
      >
        Copy
      </button>
    </div>
  );
}