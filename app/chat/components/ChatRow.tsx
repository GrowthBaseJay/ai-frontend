"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Msg } from "../lib/types";

/** Light touch: coerce common patterns into Markdown so headings/bullets render nicely */
function autoFormat(md: string): string {
  const headingPatterns = [
    /^how it works:?$/i,
    /^why it matters:?$/i,
    /^quick example:?$/i,
    /^next best move:?$/i,
    /^sources:?$/i,
  ];

  return md
    .split("\n")
    .map((raw) => {
      const line = raw.trimRight();

      // Bullets: "• foo" or "– foo" -> "- foo"
      if (/^\s*[•–]\s+/.test(line)) return line.replace(/^\s*[•–]\s+/, "- ");

      // Stage lines -> list items (e.g., "Stage I — ..." or "Stage II - ...")
      if (/^stage\s+[ivxlcdm]+\b/i.test(line)) return `- ${line}`;

      // Promote common section labels to h3
      if (headingPatterns.some((rx) => rx.test(line))) {
        return `### ${line.replace(/:$/, "")}`;
      }

      return line;
    })
    .join("\n");
}

export default function ChatRow({ msg }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";

  // Outer row takes full thread width; inner column is centered & fixed width
  return (
    <div className="group w-full">
      <div className="relative mx-auto w-full max-w-[950px]">
        {isUser ? (
          <div className="flex justify-end">
            <div className="max-w-full rounded-2xl border border-[color:var(--gb-border)]/70 bg-[color:var(--gb-surface-2)] px-3 py-2 text-[12px] leading-4 text-[color:var(--gb-text)]">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          // CHANGE: removed text-[12px] leading-4 so .prose heading/list styles apply
          <div className="prose prose-invert max-w-none text-[color:var(--gb-text)]">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {autoFormat(msg.content)}
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