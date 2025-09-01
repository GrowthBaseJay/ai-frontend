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

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

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
function isAbortError(e: unknown): e is { name?: string } {
  return typeof e === "object" && e !== null && "name" in e && (e as { name?: string }).name === "AbortError";
}

/* ------------------------------- Persistence ----------------------------- */

const LS_KEY = "gb.chats.v1";

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(convs));
  } catch {
    // ignore quota errors for MVP
  }
}

/* --------------------------------- Page --------------------------------- */

export default function ChatClient({ userId }: { userId: string }) {
  const { user } = useUser();
  const you = initialsFrom(user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress);

  // conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  // UI state
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // On mount: load convs (or create a default one)
  useEffect(() => {
    const convs = loadConversations();
    if (convs.length === 0) {
      const initial: Conversation = {
        id: uid(),
        title: "New chat",
        createdAt: now(),
        updatedAt: now(),
        messages: [{ id: uid(), role: "assistant", content: "Hey! I’m GrowthBase AI. How can I help?", createdAt: now() }],
      };
      setConversations([initial]);
      setCurrentId(initial.id);
      saveConversations([initial]);
    } else {
      // sort by updatedAt desc
      convs.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(convs);
      setCurrentId(convs[0].id);
    }
  }, []);

  // autoscroll
  const current = conversations.find(c => c.id === currentId);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, current?.messages.length, sending]);

  // keyboard: ⌘K / Ctrl+K to new chat
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        newChat();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [conversations]);

  // auto-save conversations when they change
  useEffect(() => {
    if (conversations.length > 0) saveConversations(conversations);
  }, [conversations]);

  const rows = useMemo(() => {
    const lines = input.split("\n").length;
    return Math.max(1, Math.min(8, lines));
  }, [input]);

  function updateCurrent(updater: (c: Conversation) => Conversation) {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === currentId);
      if (idx === -1) return prev;
      const updated = updater(prev[idx]);
      const next = [...prev];
      next[idx] = { ...updated, updatedAt: now() };
      // keep sorted by updatedAt desc
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      return next;
    });
  }

  function newChat() {
    const convo: Conversation = {
      id: uid(),
      title: "New chat",
      createdAt: now(),
      updatedAt: now(),
      messages: [{ id: uid(), role: "assistant", content: "New chat. How can I help?", createdAt: now() }],
    };
    setConversations(prev => {
      const next = [convo, ...prev];
      saveConversations(next);
      return next;
    });
    setCurrentId(convo.id);
    setInput("");
  }

  function selectChat(id: string) {
    setCurrentId(id);
    setSidebarOpen(false);
  }

  function deleteChat(id: string) {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const convo: Conversation = {
          id: uid(),
          title: "New chat",
          createdAt: now(),
          updatedAt: now(),
          messages: [{ id: uid(), role: "assistant", content: "New chat. How can I help?", createdAt: now() }],
        };
        saveConversations([convo]);
        setCurrentId(convo.id);
        return [convo];
      }
      saveConversations(next);
      // if we deleted current, switch to newest
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  async function send() {
    if (!current) return;
    const text = input.trim();
    if (!text || sending) return;

    // optimistic user msg
    const userMsg: Msg = { id: uid(), role: "user", content: text, createdAt: now() };
    setInput("");
    updateCurrent(c => ({
      ...c,
      title: c.title === "New chat" ? (text.slice(0, 50) || "Untitled") : c.title,
      messages: [...c.messages, userMsg],
    }));
    setSending(true);

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const streamUrl = "/api/dify-chat?stream=1";
      const res = await fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...current.messages, userMsg].map(({ role, content }) => ({ role, content })),
          userId,
        }),
        signal,
      });

      const isSSE = res.ok && res.headers.get("content-type")?.includes("text/event-stream");
      const hasBody = !!res.body;

      if (isSSE && hasBody) {
        const asstId = uid();
        updateCurrent(c => ({ ...c, messages: [...c.messages, { id: asstId, role: "assistant", content: "", createdAt: now() }] }));

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          const txt = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
          if (!txt) continue;
          setConversations(prev =>
            prev.map(conv => {
              if (conv.id !== currentId) return conv;
              return {
                ...conv,
                updatedAt: now(),
                messages: conv.messages.map(m => m.id === asstId ? { ...m, content: m.content + txt } : m),
              };
            }),
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const reply = (data && (data.reply || data.answer || data.output_text)) || "Sorry, I didn’t get that.";

        const asstId = uid();
        updateCurrent(c => ({ ...c, messages: [...c.messages, { id: asstId, role: "assistant", content: "", createdAt: now() }] }));

        const step = Math.max(1, Math.floor(reply.length / 60));
        for (let i = 0; i < reply.length; i += step) {
          await new Promise(r => setTimeout(r, 16));
          const slice = reply.slice(i, i + step);
          setConversations(prev =>
            prev.map(conv => {
              if (conv.id !== currentId) return conv;
              return {
                ...conv,
                updatedAt: now(),
                messages: conv.messages.map(m => m.id === asstId ? { ...m, content: m.content + slice } : m),
              };
            }),
          );
        }
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        updateCurrent(c => ({ ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: "…stopped.", createdAt: now() }] }));
      } else {
        updateCurrent(c => ({ ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: "Network error contacting AI.", createdAt: now() }] }));
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

  /* ---------- Build message list with day dividers for current chat ---------- */

  const withDividers: (Msg | { divider: true; label: string; key: string })[] = [];
  if (current) {
    let lastDay = "";
    for (const m of current.messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) {
        withDividers.push({ divider: true, label, key: `div-${label}-${m.createdAt}` });
        lastDay = label;
      }
      withDividers.push(m);
    }
  }

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen max-h-screen bg-[var(--gb-bg)] text-[var(--gb-text)] flex">
      {/* Sidebar (hidden on small screens) */}
      <aside className={clsx(
        "hidden md:flex md:flex-col w-64 border-r border-[var(--gb-border)] bg-[color:var(--gb-bg)]/60 backdrop-blur",
        "shrink-0"
      )}>
        <div className="h-12 px-3 flex items-center justify-between border-b border-[var(--gb-border)]">
          <div className="text-xs text-[color:var(--gb-subtle)]">Conversations</div>
          <button
            onClick={newChat}
            className="text-xs px-2 py-1 rounded border border-[var(--gb-border)] hover:bg-[var(--gb-surface)]"
            title="New chat (⌘K / Ctrl+K)"
          >
            <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {conversations.map(c => (
            <div
              key={c.id}
              className={clsx(
                "group rounded-lg border px-2 py-2 cursor-pointer",
                c.id === currentId
                  ? "border-[var(--gb-border)] bg-[var(--gb-surface-2)]"
                  : "border-[var(--gb-border)] hover:bg-[var(--gb-surface)]"
              )}
              onClick={() => selectChat(c.id)}
            >
              <div className="text-[13px] truncate">{c.title || "Untitled"}</div>
              <div className="text-[10px] text-[color:var(--gb-subtle)]">{new Date(c.updatedAt).toLocaleString()}</div>
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  className="text-[10px] text-[color:var(--gb-subtle)] hover:opacity-80"
                  onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-xs text-[color:var(--gb-subtle)] px-2">No chats yet</div>
          )}
        </div>
        <div className="p-2 border-t border-[var(--gb-border)] text-[11px] text-[color:var(--gb-subtle)]">
          Tip: ⌘K / Ctrl+K for new chat
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-12 flex items-center justify-center border-b border-[var(--gb-border)]">
          <div className="w-full max-w-3xl px-4 flex items-center justify-between">
            <div className="font-medium tracking-tight">GrowthBase AI</div>
            <div className="flex items-center gap-2">
              {/* mobile-only sidebar toggle */}
              <button
                className="md:hidden text-xs px-2 py-1 rounded border border-[var(--gb-border)]"
                onClick={() => setSidebarOpen(v => !v)}
              >
                {sidebarOpen ? "Close" : "Chats"}
              </button>
              <button
                onClick={newChat}
                className="hidden md:inline-flex text-xs px-2 py-1 rounded border border-[var(--gb-border)] hover:bg-[var(--gb-surface)]"
                title="New chat (⌘K / Ctrl+K)"
              >
                <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
                New Chat
              </button>
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="md:hidden border-b border-[var(--gb-border)] bg-[color:var(--gb-bg)]/95">
            <div className="px-3 py-2 space-y-1">
              {conversations.map(c => (
                <div
                  key={c.id}
                  className={clsx(
                    "rounded-lg border px-2 py-2",
                    c.id === currentId ? "border-[var(--gb-border)] bg-[var(--gb-surface-2)]" : "border-[var(--gb-border)]"
                  )}
                  onClick={() => { selectChat(c.id); }}
                >
                  <div className="text-[13px] truncate">{c.title || "Untitled"}</div>
                  <div className="text-[10px] text-[color:var(--gb-subtle)]">{new Date(c.updatedAt).toLocaleString()}</div>
                </div>
              ))}
              <div className="py-1">
                <button
                  onClick={newChat}
                  className="text-xs px-2 py-1 rounded border border-[var(--gb-border)] hover:bg-[var(--gb-surface)] w-full text-left"
                >
                  <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
                  New Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <section className="flex-1 w-full overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4 space-y-4">
            {current ? (
              <>
                {buildWithDividers(withDividers).map(item =>
                  "divider" in item ? (
                    <DayDivider key={item.key} label={item.label} />
                  ) : (
                    <ChatRow key={item.id} you={initialsFrom(user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress)} msg={item} />
                  )
                )}
                {sending && (
                  <div className="flex items-start gap-3">
                    <Avatar label="GB" color="emerald" />
                    <div className="text-sm text-[color:var(--gb-subtle)] pt-1">Thinking…</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            ) : (
              <div className="text-sm text-[color:var(--gb-subtle)]">Loading…</div>
            )}
          </div>
        </section>

        {/* Composer */}
        <footer className="border-t border-[var(--gb-border)] bg-[color:var(--gb-bg)]/70 backdrop-blur">
          <div className="max-w-3xl mx-auto w-full px-4 py-3">
            <div className="rounded-xl bg-[var(--gb-bg)] border border-[var(--gb-border)] p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={rows}
                placeholder="Type a message…"
                className="w-full resize-none bg-transparent outline-none text-sm leading-6 placeholder:text-[color:var(--gb-subtle)]"
                disabled={sending || !current}
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  disabled={!sending}
                  className={clsx(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs",
                    sending
                      ? "border-[var(--gb-border)]"
                      : "border-[var(--gb-border)] opacity-60 cursor-not-allowed",
                  )}
                  title="Stop"
                  style={{ color: "var(--gb-text)" }}
                >
                  <StopCircle className="h-4 w-4" />
                  Stop
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || sending || !current}
                  className={clsx(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs",
                    input.trim() && !sending
                      ? "bg-[color:var(--gb-text)] text-[color:var(--gb-bg)] hover:opacity-90"
                      : "bg-[var(--gb-surface)] text-[color:var(--gb-subtle)] cursor-not-allowed",
                  )}
                  title="Send"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[color:var(--gb-subtle)]">
              Enter to send • Shift+Enter for newline • ⌘K / Ctrl+K for new chat
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------- Components ------------------------------ */

function buildWithDividers(
  items: (Msg | { divider: true; label: string; key: string })[]
) {
  return items;
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative my-2 flex items-center justify-center text-[11px] text-[color:var(--gb-subtle)]">
      <div className="w-full border-t border-[var(--gb-border)]" />
      <span className="absolute bg-[var(--gb-bg)] px-2">{label}</span>
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
          isUser ? "bg-[var(--gb-surface-2)] border border-[var(--gb-border)]" : "bg-[var(--gb-surface)]"
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <MarkdownWithCopy content={msg.content} />
        )}
        <div className="mt-1 text-[10px] text-[color:var(--gb-subtle)]">{timeLabel(msg.createdAt)}</div>
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
          <code className="rounded px-1 py-0.5" style={{ background: "var(--gb-surface)" }} {...props}>
            {text}
          </code>
        );
      }
      return (
        <div className="relative group">
          <button
            type="button"
            onClick={() => copyText(text)}
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border"
            style={{ background: "var(--gb-surface-2)", borderColor: "var(--gb-border)", color: "var(--gb-text)" }}
            title="Copy code"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <pre className="overflow-x-auto rounded-lg border p-3 text-[13px] leading-6" style={{ borderColor: "var(--gb-border)", background: "var(--gb-bg)" }}>
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
      return <th className="border-b px-2 py-1 text-left" style={{ borderColor: "var(--gb-border)" }}>{children}</th>;
    },
    td({ children }) {
      return <td className="border-b px-2 py-1" style={{ borderColor: "var(--gb-border)" }}>{children}</td>;
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}