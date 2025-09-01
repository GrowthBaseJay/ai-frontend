"use client";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Msg } from "../lib/types";
import CodeBlock from "./CodeBlock";

type Props = { msg: Msg; you: string };

const mdComponents: Partial<Components> = {
  // keep <pre> wrapper neutral; CodeBlock handles styling
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  code: ({
    inline,
    className,
    children,
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) =>
    inline ? (
      <code className={className}>{children}</code>
    ) : (
      <CodeBlock className={className}>{children}</CodeBlock>
    ),
};

export default function ChatRow({ msg }: Props) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[17px] leading-7 text-[color:var(--gb-text)]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={mdComponents}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="prose prose-invert max-w-none text-[17px] leading-7 text-[color:var(--gb-text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={mdComponents}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}