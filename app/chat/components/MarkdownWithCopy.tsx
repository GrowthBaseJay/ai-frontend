"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Copy } from "lucide-react";
import { copyText } from "../lib/utils";

type CodeProps =
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  };

export default function MarkdownWithCopy({ content }: { content: string }) {
  const components: Components = {
    code({ inline, className, children, ...props }: CodeProps) {
      const text = String(children ?? "");
      if (inline) {
        return (
          <code className="rounded bg-neutral-900 px-1 py-0.5" {...props}>
            {text}
          </code>
        );
      }
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={() => copyText(text)}
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
            title="Copy code"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-[13px] leading-6">
            <code className={className} {...props}>
              {text}
            </code>
          </pre>
        </div>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return <th className="border-b border-neutral-700 px-2 py-1 text-left">{children}</th>;
    },
    td({ children }) {
      return <td className="border-b border-neutral-900 px-2 py-1">{children}</td>;
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}