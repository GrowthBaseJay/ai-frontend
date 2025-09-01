"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Msg } from "../lib/types";

export default function ChatRow({ msg }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  // Outer row takes full thread width; inner column is centered & fixed width
  return (
    <div className="group w-full">
      <div className="relative mx-auto w-full max-w-[920px]">
        {isUser ? (
          <div className="flex justify-end">
            <div className="max-w-full rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[16px] leading-7 text-[color:var(--gb-text)]">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-[16px] leading-7 text-[color:var(--gb-text)]">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Copy button (assistant only) */}
        {!isUser && (
          <button
            className="absolute -top-3 -right-2 hidden rounded-md border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface)] px-2 py-1 text-xs text-[color:var(--gb-subtle)] hover:text-[color:var(--gb-text)] group-hover:block"
            onClick={() => navigator.clipboard.writeText(msg.content)}
            aria-label="Copy message"
            title="Copy"
          >
            Copy
          </button>
        )}
      </div>
    </div>
  );
}