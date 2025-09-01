"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Msg } from "../lib/types";

/**
 * Clean, ChatGPT-like row:
 * - assistant: left-aligned plain text block (no bubble, no avatar, no timestamp)
 * - user: right-aligned subtle bubble (no timestamp)
 * Brand colors come from CSS vars defined in globals.css.
 */
export default function ChatRow({ msg, you }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  if (isUser) {
    // USER message → subtle right bubble
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[80%] rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[15px] leading-6 text-[color:var(--gb-text)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  // ASSISTANT message → left-aligned plain text block (no bubble)
  return (
    <div className="w-full">
      <div className="prose prose-invert max-w-none text-[15px] leading-7 text-[color:var(--gb-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
}