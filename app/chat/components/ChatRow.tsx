"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import CodeBlock from "./CodeBlock";
import type { Msg } from "../lib/types";

/* ChatGPT-like:
   - assistant: plain left-aligned text block (no avatar/timestamp)
   - user: right-aligned subtle bubble
*/
export default function ChatRow({ msg }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  const components = {
    pre: ({ children }: any) => <>{children}</>,
    code: ({ inline, className, children }: any) =>
      inline ? <code className={className}>{children}</code> : <CodeBlock className={className}>{children}</CodeBlock>,
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[17px] leading-7 text-[color:var(--gb-text)]">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="prose prose-invert max-w-none text-[17px] leading-7 text-[color:var(--gb-text)]">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}