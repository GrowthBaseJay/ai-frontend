"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Copy, StopCircle, SendHorizontal } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

function copyText(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {
    /* noop */
  }
}

export default function ChatClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I’m GrowthBase AI. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    try {
      const res = await fetch("/api/dify-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }],
          userId,
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I didn’t get that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Error contacting AI." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-black text-white">
      {/* Top bar */}
      <header className="h-14 flex items-center justify-center border-b border-neutral-900">
        <div className="text-sm font-medium tracking-wide text-neutral-300">
          GrowthBase AI
        </div>
      </header>

      {/* Messages */}
      <section className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 py-6 overflow-y-auto">
        {messages.map((m, i) => (
          <ChatRow key={i} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div className="mt-2 text-xs text-neutral-400">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </section>

      {/* Composer */}
      <footer className="w-full border-t border-neutral-900 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40">
        <div className="max-w-3xl mx-auto p-3 md:p-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-2">
            <textarea
              className="w-full resize-none bg-transparent outline-none text-[15px] leading-6 placeholder:text-neutral-500 px-2 py-1"
              rows={1}
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="text-[11px] text-neutral-500">
                Press <span className="border border-neutral-700 px-1 rounded">Enter</span> to send •{" "}
                <span className="border border-neutral-700 px-1 rounded">Shift</span>+
                <span className="border border-neutral-700 px-1 rounded">Enter</span> for newline
              </div>
              <div className="flex items-center gap-1.5">
                {sending && (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1 text-xs text-neutral-400 px-2 py-1 rounded border border-neutral-800"
                    title="Sending"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    Sending…
                  </button>
                )}
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="inline-flex items-center gap-1 text-xs bg-white text-black px-3 py-1.5 rounded-md disabled:opacity-60"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ChatRow({ role, content }: Msg) {
  const isUser = role === "user";
  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 text-[14.5px] leading-6",
          isUser ? "bg-neutral-900" : "bg-neutral-800",
        ].join(" ")}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <MarkdownWithCopy content={content} />
        )}
      </div>
    </div>
  );
}

/* ---------- Markdown with typed component overrides ---------- */

// The `code` renderer needs an explicit prop type so TS knows about `inline`.
type CodeProps =
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  };

function MarkdownWithCopy({ content }: { content: string }) {
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
      return (
        <th className="border-b border-neutral-700 px-2 py-1 text-left">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="border-b border-neutral-900 px-2 py-1">
          {children}
        </td>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}