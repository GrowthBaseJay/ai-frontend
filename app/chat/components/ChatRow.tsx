"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Msg } from "../lib/types";

export default function ChatRow({ msg }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  if (isUser) {
    // USER → right-aligned subtle bubble
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[80%] rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[16px] leading-7 text-[color:var(--gb-text)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // ASSISTANT → left-aligned plain text block with hover copy
  return (
    <div className="group relative w-full">
      <div className="prose prose-invert max-w-none text-[color:var(--gb-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>

      {/* Copy on hover (top-right of message block) */}
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