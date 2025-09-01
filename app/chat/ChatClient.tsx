"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SendHorizontal, StopCircle, ArrowDown } from "lucide-react";
import type { Conversation, Msg } from "./lib/types";
import {
  uid,
  now,
  initialsFrom,
  dayLabel,
  clsx,
  isAbortError,
  loadConversations,
  saveConversations,
} from "./lib/utils";

import ChatRow from "./components/ChatRow";
import DayDivider from "./components/DayDivider";

export default function ChatClient({ userId }: { userId: string }) {
  const { user } = useUser();
  const you = initialsFrom(
    user?.fullName ??
      user?.username ??
      user?.primaryEmailAddress?.emailAddress
  );

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string>("");

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const threadRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // model from localStorage (Sidebar writes it)
  const model =
    typeof window !== "undefined"
      ? localStorage.getItem("gb-model") || "gpt-4o-mini"
      : "gpt-4o-mini";

  // mount: load conversations
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
            content:
              "Hey! I’m GrowthBase AI. How can I help?\n\n• Draft messages\n• Look something up fast\n• Plan your week\n\nType below to start.",
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

  // find current
  const current = conversations.find((c) => c.id === currentId);

  // autoscroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, current?.messages.length, sending]);

  // show "jump to latest" when scrolled up — TS-safe
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return; // runtime guard

    // create a non-null alias so TS narrows the type
    const target: HTMLDivElement = el;

    const onScroll = () => {
      const nearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 120;
      setShowJump(!nearBottom);
    };

    // initialize state based on current position
    onScroll();

    target.addEventListener("scroll", onScroll, {
      passive: true,
    } as AddEventListenerOptions);
    return () => {
      target.removeEventListener("scroll", onScroll);
    };
  }, []);

  // persist conversations
  useEffect(() => {
    if (conversations.length) saveConversations(conversations);
  }, [conversations]);

  const rows = useMemo(
    () => Math.max(1, Math.min(7, input.split("\n").length)),
    [input]
  );

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
      messages: [],
    };
    setConversations((prev) => {
      const next = [convo, ...prev];
      saveConversations(next);
      return next;
    });
    setCurrentId(convo.id);
    setInput("");
  }

  async function send() {
    if (!current) return;
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: now(),
    };
    setInput("");
    updateCurrent((c) => ({
      ...c,
      title:
        c.title === "New chat" ? text.slice(0, 50) || "Untitled" : c.title,
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
          model, // pass model along
          messages: [...current.messages, userMsg].map(({ role, content }) => ({
            role,
            content,
          })),
          userId,
        }),
        signal,
      });

      const isSSE =
        res.ok && res.headers.get("content-type")?.includes("text/event-stream");
      const hasBody = !!res.body;

      if (isSSE && hasBody) {
        const asstId = uid();
        updateCurrent((c) => ({
          ...c,
          messages: [
            ...c.messages,
            { id: asstId, role: "assistant", content: "", createdAt: now() },
          ],
        }));

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const chunk = await reader.read();
          done = chunk.done;
          const txt = decoder.decode(chunk.value || new Uint8Array(), {
            stream: !done,
          });
          if (!txt) continue;
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id !== currentId
                ? conv
                : {
                    ...conv,
                    updatedAt: now(),
                    messages: conv.messages.map((m) =>
                      m.id === asstId
                        ? { ...m, content: m.content + txt }
                        : m
                    ),
                  }
            )
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const reply =
          (data && (data.reply || data.answer || data.output_text)) ||
          "Sorry, I didn’t get that.";

        const asstId = uid();
        updateCurrent((c) => ({
          ...c,
          messages: [
            ...c.messages,
            { id: asstId, role: "assistant", content: "", createdAt: now() },
          ],
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
                      m.id === asstId
                        ? { ...m, content: m.content + slice }
                        : m
                    ),
                  }
            )
          );
        }
      }
    } catch (err: unknown) {
      if (!isAbortError(err)) {
        updateCurrent((c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: uid(),
              role: "assistant",
              content: "Network error contacting AI.",
              createdAt: now(),
            },
          ],
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

  // Build message list with day dividers (labels only)
  const items: (Msg | { divider: true; label: string; key: string })[] = [];
  if (current) {
    let lastDay = "";
    for (const m of current.messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) {
        items.push({ divider: true, label, key: `div-${label}-${m.createdAt}` });
        lastDay = label;
      }
      items.push(m);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* THREAD */}
      <section ref={threadRef} className="flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[980px] px-4 md:px-6 py-4">
          {/* Empty state */}
          {current?.messages.length === 0 && (
            <div className="mb-6 text-[color:var(--gb-subtle)]">
              <div>Try things like:</div>
              <ul className="list-disc pl-5">
                <li>“Draft a DM to re-engage past clients.”</li>
                <li>“List 5 hooks to promote my 30-day accelerator.”</li>
              </ul>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-5">
            {items.map((item) =>
              "divider" in item ? (
                <DayDivider key={item.key} label={item.label} />
              ) : (
                <ChatRow key={item.id} you={you} msg={item} />
              )
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Jump to latest */}
        {showJump && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="fixed bottom-24 right-6 rounded-full border border-[color:var(--gb-border)]/60 bg-[color:var(--gb-surface)] px-3 py-1.5 text-xs text-[color:var(--gb-text)] shadow"
            aria-label="Jump to latest"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowDown className="h-4 w-4" /> Jump to latest
            </span>
          </button>
        )}
      </section>

      {/* COMPOSER — fixed, no gray line */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-72 bg-[var(--gb-bg)]">
        <div className="mx-auto w-full max-w-[980px] px-4 py-3">
          <div className="rounded-xl bg-[color:var(--gb-surface)] border border-[color:var(--gb-border)]/80 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={rows}
              placeholder="Message GrowthBase AI"
              className="w-full resize-none bg-transparent outline-none text-[17px] leading-7 placeholder:text-[color:var(--gb-subtle)] text-[color:var(--gb-text)]"
              disabled={sending || !current}
              aria-label="Message input"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              {sending && (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--gb-border)]/80 px-3 py-1.5 text-xs hover:bg-[color:var(--gb-surface-2)]"
                  aria-label="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop
                </button>
              )}
              <button
                type="button"
                onClick={async () => await send()}
                disabled={!input.trim() || sending || !current}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs",
                  input.trim() && !sending
                    ? "bg-[color:var(--gb-accent)] text-black hover:brightness-110"
                    : "bg-[color:var(--gb-surface-2)] text-[color:var(--gb-subtle)] cursor-not-allowed"
                )}
                aria-label="Send message"
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