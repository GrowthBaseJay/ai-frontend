"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { StopCircle, SendHorizontal } from "lucide-react";

import type { Conversation, Msg } from "./lib/types";
import {
  uid, now, initialsFrom, dayLabel, clsx, isAbortError,
  loadConversations, saveConversations
} from "./lib/utils";

import ChatRow from "./components/ChatRow";
import DayDivider from "./components/DayDivider";
import Avatar from "./components/Avatar";

export default function ChatClient({ userId }: { userId: string }) {
  const { user } = useUser();
  const you = initialsFrom(
    user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const convs = loadConversations();
    if (convs.length === 0) {
      const initial: Conversation = {
        id: uid(),
        title: "New chat",
        createdAt: now(),
        updatedAt: now(),
        messages: [
          { id: uid(), role: "assistant", content: "Hey! I’m GrowthBase AI. How can I help?", createdAt: now() },
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

  const current = conversations.find((c) => c.id === currentId);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); },
    [currentId, current?.messages.length, sending]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); newChat(); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [conversations]);

  useEffect(() => { if (conversations.length > 0) saveConversations(conversations); }, [conversations]);

  const rows = useMemo(() => Math.max(1, Math.min(8, input.split("\n").length)), [input]);

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
    setConversations((prev) => { const next = [convo, ...prev]; saveConversations(next); return next; });
    setCurrentId(convo.id);
    setInput("");
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
      const res = await fetch("/api/dify-chat?stream=1", {
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  function stop() { abortRef.current?.abort(); }

  // Build message list with day dividers
  const items: (Msg | { divider: true; label: string; key: string })[] = [];
  if (current) {
    let lastDay = "";
    for (const m of current.messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) { items.push({ divider: true, label, key: `div-${label}-${m.createdAt}` }); lastDay = label; }
      items.push(m);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* THREAD (pad for fixed composer height) */}
      <section className="flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 py-4 space-y-4">
          {current ? (
            <>
              {items.map((item) =>
                "divider" in item ? (
                  <DayDivider key={item.key} label={item.label} />
                ) : (
                  <ChatRow key={item.id} you={you} msg={item} />
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

      {/* COMPOSER — fixed, NO BORDER LINE */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-72 bg-[var(--gb-bg)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 py-3">
          <div className="rounded-xl bg-[color:var(--gb-surface)] border border-[color:var(--gb-border)]/80 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={rows}
              placeholder="Message GrowthBase AI"
              className="w-full resize-none bg-transparent outline-none text-[16px] leading-7 placeholder:text-[color:var(--gb-subtle)] text-[color:var(--gb-text)]"
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
                    ? "border-[color:var(--gb-border)]/80 text-[color:var(--gb-text)] hover:bg-[color:var(--gb-surface-2)]"
                    : "border-[color:var(--gb-border)]/40 text-[color:var(--gb-subtle)] cursor-not-allowed"
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
                    ? "bg-[color:var(--gb-accent)] text-black hover:brightness-110"
                    : "bg-[color:var(--gb-surface-2)] text-[color:var(--gb-subtle)] cursor-not-allowed"
                )}
                title="Send"
              >
                <SendHorizontal className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}