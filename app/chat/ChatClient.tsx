"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { RotateCcw, StopCircle, SendHorizontal } from "lucide-react";

import type { Conversation, Msg } from "./lib/types";
import {
  uid, now, initialsFrom, dayLabel, clsx, isAbortError,
  loadConversations, saveConversations
} from "./lib/utils";

import ChatRow from "./components/ChatRow";
import DayDivider from "./components/DayDivider";
import Avatar from "./components/Avatar";

/* --------------------------------- Page --------------------------------- */

export default function ChatClient({ userId }: { userId: string }) {
  const { user } = useUser();
  const you =
    initialsFrom(user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress);

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
        messages: [
          {
            id: uid(),
            role: "assistant",
            content: "Hey! I’m GrowthBase AI. How can I help?",
            createdAt: now(),
          },
        ],
      };
      setConversations([initial]);
      setCurrentId(initial.id);
      saveConversations([initial]);
    } else {
      convs.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(convs);
      setCurrentId(convs[0].id);
    }
  }, []);

  // current chat + autoscroll
  const current = conversations.find((c) => c.id === currentId);
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
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === currentId);
      if (idx === -1) return prev;
      const updated = updater(prev[idx]);
      const next = [...prev];
      next[idx] = { ...updated, updatedAt: now() };
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
      messages: [
        { id: uid(), role: "assistant", content: "New chat. How can I help?", createdAt: now() },
      ],
    };
    setConversations((prev) => {
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
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const convo: Conversation = {
          id: uid(),
          title: "New chat",
          createdAt: now(),
          updatedAt: now(),
          messages: [
            { id: uid(), role: "assistant", content: "New chat. How can I help?", createdAt: now() },
          ],
        };
        saveConversations([convo]);
        setCurrentId(convo.id);
        return [convo];
      }
      saveConversations(next);
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  }

  async function send() {
    if (!current) return;
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Msg = { id: uid(), role: "user", content: text, createdAt: now() };
    setInput("");
    updateCurrent((c) => ({
      ...c,
      title: c.title === "New chat" ? text.slice(0, 50) || "Untitled" : c.title,
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
        updateCurrent((c) => ({
          ...c,
          messages: [...c.messages, { id: asstId, role: "assistant", content: "", createdAt: now() }],
        }));

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          const txt = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
          if (!txt) continue;
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id !== currentId
                ? conv
                : {
                    ...conv,
                    updatedAt: now(),
                    messages: conv.messages.map((m) =>
                      m.id === asstId ? { ...m, content: m.content + txt } : m
                    ),
                  }
            )
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const reply = (data && (data.reply || data.answer || data.output_text)) || "Sorry, I didn’t get that.";

        const asstId = uid();
        updateCurrent((c) => ({
          ...c,
          messages: [...c.messages, { id: asstId, role: "assistant", content: "", createdAt: now() }],
        }));

        const step = Math.max(1, Math.floor(reply.length / 60));
        for (let i = 0; i < reply.length; i += step) {
          await new Promise((r) => setTimeout(r, 16));
          const slice = reply.slice(i, i + step);
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id !== currentId
                ? conv
                : {
                    ...conv,
                    updatedAt: now(),
                    messages: conv.messages.map((m) =>
                      m.id === asstId ? { ...m, content: m.content + slice } : m
                    ),
                  }
            )
          );
        }
      }
    } catch (err: unknown) {
      if (isAbortError(err)) {
        updateCurrent((c) => ({
          ...c,
          messages: [...c.messages, { id: uid(), role: "assistant", content: "…stopped.", createdAt: now() }],
        }));
      } else {
        updateCurrent((c) => ({
          ...c,
          messages: [...c.messages, { id: uid(), role: "assistant", content: "Network error contacting AI.", createdAt: now() }],
        }));
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

  /* ---------- Build message list with day dividers ---------- */
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
    <div className="min-h-screen max-h-screen bg-black text-white flex">
      {/* Sidebar (hidden on small screens) */}
      <aside
        className={clsx(
          "hidden md:flex md:flex-col w-64 border-r border-neutral-900 bg-black/60 backdrop-blur",
          "shrink-0"
        )}
      >
        <div className="h-12 px-3 flex items-center justify-between border-b border-neutral-900">
          <div className="text-xs text-neutral-400">Conversations</div>
          <button
            onClick={newChat}
            className="text-xs px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900"
            title="New chat (⌘K / Ctrl+K)"
          >
            <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={clsx(
                "group rounded-lg border px-2 py-2 cursor-pointer",
                c.id === currentId
                  ? "border-neutral-700 bg-neutral-900"
                  : "border-neutral-900 hover:bg-neutral-950"
              )}
              onClick={() => selectChat(c.id)}
            >
              <div className="text-[13px] truncate">{c.title || "Untitled"}</div>
              <div className="text-[10px] text-neutral-500">
                {new Date(c.updatedAt).toLocaleString()}
              </div>
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  className="text-[10px] text-neutral-400 hover:text-neutral-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-xs text-neutral-500 px-2">No chats yet</div>
          )}
        </div>
        <div className="p-2 border-t border-neutral-900 text-[11px] text-neutral-500">
          Tip: ⌘K / Ctrl+K for new chat
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-12 flex items-center justify-center border-b border-neutral-900">
          <div className="w-full max-w-3xl px-4 flex items-center justify-between">
            <div className="font-medium tracking-tight">GrowthBase AI</div>
            <div className="flex items-center gap-2">
              {/* mobile-only sidebar toggle */}
              <button
                className="md:hidden text-xs px-2 py-1 rounded border border-neutral-800"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                {sidebarOpen ? "Close" : "Chats"}
              </button>
              <button
                onClick={newChat}
                className="hidden md:inline-flex text-xs px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900"
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
          <div className="md:hidden border-b border-neutral-900 bg-black/95">
            <div className="px-3 py-2 space-y-1">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={clsx(
                    "rounded-lg border px-2 py-2",
                    c.id === currentId ? "border-neutral-700 bg-neutral-900" : "border-neutral-900"
                  )}
                  onClick={() => {
                    selectChat(c.id);
                  }}
                >
                  <div className="text-[13px] truncate">{c.title || "Untitled"}</div>
                  <div className="text-[10px] text-neutral-500">
                    {new Date(c.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
              <div className="py-1">
                <button
                  onClick={newChat}
                  className="text-xs px-2 py-1 rounded border border-neutral-800 hover:bg-neutral-900 w-full text-left"
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
                {(() => {
                  const items: (Msg | { divider: true; label: string; key: string })[] = [];
                  let lastDay = "";
                  for (const m of current.messages) {
                    const label = dayLabel(m.createdAt);
                    if (label !== lastDay) {
                      items.push({ divider: true, label, key: `div-${label}-${m.createdAt}` });
                      lastDay = label;
                    }
                    items.push(m);
                  }
                  return items;
                })().map((item) =>
                  "divider" in item ? (
                    <DayDivider key={item.key} label={item.label} />
                  ) : (
                    <ChatRow key={item.id} you={you} msg={item} />
                  )
                )}
                {sending && (
                  <div className="flex items-start gap-3">
                    <Avatar label="GB" color="emerald" />
                    <div className="text-sm text-neutral-400 pt-1">Thinking…</div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            ) : (
              <div className="text-sm text-neutral-400">Loading…</div>
            )}
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
                disabled={sending || !current}
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
                      : "border-neutral-900 text-neutral-600 cursor-not-allowed"
                  )}
                  title="Stop"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop
                </button>
                <button
                  type="button"
                  onClick={async () => await send()}
                  disabled={!input.trim() || sending || !current}
                  className={clsx(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs",
                    input.trim() && !sending
                      ? "bg-white text-black hover:opacity-90"
                      : "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                  )}
                  title="Send"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              Enter to send • Shift+Enter for newline • ⌘K / Ctrl+K for new chat
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}