"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Copy, StopCircle, SendHorizontal, RotateCcw } from "lucide-react";

/* ----------------------------- Types & utils ----------------------------- */

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; createdAt: number };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function now() {
  return Date.now();
}
function initialsFrom(name?: string | null): string {
  if (!name) return "You";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "You";
}
function dayLabel(ts: number) {
  const d = new Date(ts);
  const t = new Date();
  const sameDay = d.toDateString() === t.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(t);
  yesterday.setDate(t.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}
function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}
function clsx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* --------------------------------- Page --------------------------------- */

export default function ChatClient({ userId }: { userId: string }) {
  const { user } = useUser();
  const you = initialsFrom(user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress);

  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", content: "Hey! I’m GrowthBase AI. How can I help?", createdAt: now() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // composer rows (auto-grow 1–8)
  const rows = useMemo(() => {
    const lines = input.split("\n").length;
    return Math.max(1, Math.min(8, lines));
  }, [input]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    // optimistic user message
    const userMsg: Msg = { id: uid(), role: "user", content: text, createdAt: now() };
    setInput("");
    setMessages(m => [...m, userMsg]);
    setSending(true);

    // try streaming first; if not supported, fall back to blocking
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      // Attempt SSE streaming (server may or may not support this)
      const streamUrl = "/api/dify-chat?stream=1";
      const res = await fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          userId,
        }),
        signal,
      });

      const isSSE = res.ok && res.headers.get("content-type")?.includes("text/event-stream");
      const hasBody = !!res.body;

      if (isSSE && hasBody) {
        // Add empty assistant msg we’ll fill as tokens arrive
        const asstId = uid();
        setMessages(m => [...m, { id: asstId, role: "assistant", content: "", createdAt: now() }]);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          const text = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
          if (!text) continue;

          // Dify SSE usually sends lines with `data: {...}` or plain text chunks.
          // We’ll append raw text; server proxy can normalize later.
          setMessages(m =>
            m.map(msg => (msg.id === asstId ? { ...msg, content: msg.content + text } : msg)),
          );
        }
      } else {
        // Fallback: blocking JSON (your current server behavior). Typewriter the reply for vibes.
        const data = await res.json().catch(() => ({}));
        const reply = (data && (data.reply || data.answer || data.output_text)) || "Sorry, I didn’t get that.";

        const asstId = uid();
        setMessages(m => [...m, { id: asstId, role: "assistant", content: "", createdAt: now() }]);

        // simple typewriter effect
        const step = Math.max(1, Math.floor(reply.length / 60));
        for (let i = 0; i < reply.length; i += step) {
          await new Promise(r => setTimeout(r, 16)); // ~60fps
          const slice = reply.slice(i, i + step);
          setMessages(m =>
            m.map(msg => (msg.id === asstId ? { ...msg, content: msg.content + slice } : msg)),
          );
        }
      }
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        // user hit Stop
        setMessages(m => [...m, { id: uid(), role: "assistant", content: "…stopped.", createdAt: now() }]);
      } else {
        setMessages(m => [...m, { id: uid(), role: "assistant", content: "Network error contacting AI.", createdAt: now() }]);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    setMessages([{ id: uid(), role: "assistant", content: "New chat. How can I help?", createdAt: now() }]);
  }

  // Build an array with day dividers inserted
  const withDividers: (Msg | { divider: true; label: string; key: string })[] = [];
  let lastDay = "";
  for (const m of messages) {
    const label = dayLabel(m.createdAt);
    if (label !== lastDay) {
      withDividers.push({ divider: true, label, key: `div-${label}-${m.createdAt}` });
      lastDay = label;
    }
    withDividers.push(m);
  }

  return (
    <main className="min-h-screen max-h-screen flex flex-col bg-black text-white">
      {/* Header */}
      <header className="h-12 flex items-center justify-center border-b border-neutral-900">
        <div className="w-full max-w-3xl px-4 flex items-center justify-between">
          <div className="font-medium tracking-tight">GrowthBase AI</div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="text-xs px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900"
              title="New chat"
              type="button"
            >
              <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <section className="flex-1 w-full overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4 space-y-4">
          {withDividers.map((item) =>
            "divider" in item ? (
              <DayDivider key={item.key} label={item.label} />
            ) : (
              <ChatRow key={item.id} you={you} msg={item} />
            ),
          )}

          {sending && (
            <div className="flex items-start gap-3">
              <Avatar label="GB" color="emerald" />
              <div className="text-sm text-neutral-400 pt-1">Thinking…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </section>

      {/* Composer */}
      <footer className="border-t border-neutral-900 bg-black/70 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={rows}
              placeholder="Type a message…"
              className="w-full resize-none bg-transparent outline-none text-sm leading-6 placeholder:text-neutral-500"
              disabled={sending}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={stop}
                disabled={!sending}
                className={clsx(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs",
                  sending
                    ? "border-neutral-700 text-neutral-200 hover:bg-neutral-900"
                    : "border-neutral-900 text-neutral-600 cursor-not-allowed",
                )}
                title="Stop"
              >
                <StopCircle className="h-4 w-4" />
                Stop
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!input.trim() || sending}
                className={clsx(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs",
                  input.trim() && !sending
                    ? "bg-white text-black hover:opacity-90"
                    : "bg-neutral-800 text-neutral-400 cursor-not-allowed",
                )}
                title="Send"
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Enter to send • Shift+Enter for newline
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ------------------------------- Components ------------------------------ */

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative my-2 flex items-center justify-center text-[11px] text-neutral-500">
      <div className="w-full border-t border-neutral-900" />
      <span className="absolute bg-black px-2">{label}</span>
    </div>
  );
}

function ChatRow({ msg, you }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Avatar label="GB" color="emerald" />}
      <div
        className={clsx(
          "max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-6",
          isUser ? "bg-neutral-900" : "bg-neutral-800",
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <MarkdownWithCopy content={msg.content} />
        )}
        <div className="mt-1 text-[10px] text-neutral-400">{timeLabel(msg.createdAt)}</div>
      </div>
      {isUser && <Avatar label={you} color="indigo" />}
    </div>
  );
}

function Avatar({ label, color = "indigo" }: { label: string; color?: "indigo" | "emerald" | "neutral" }) {
  const colorMap = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    neutral: "bg-neutral-600",
  } as const;
  return (
    <div className={clsx("h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold", colorMap[color])}>
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ---------- Markdown with typed overrides + copy on fenced code ---------- */

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