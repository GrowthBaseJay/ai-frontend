"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatClient({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey! I’m GrowthBase AI. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, sending]);

  function autosize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }

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
        body: JSON.stringify({ messages: [...messages, { role: "user", content: text }], userId }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I didn’t get that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error contacting AI." }]);
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
    <div className="min-h-screen w-full bg-[#0b0b0b] text-[#e7e7e7]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0b0b0b]/80 backdrop-blur">
        <div className="mx-auto max-w-3xl h-14 px-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">GrowthBase AI</div>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-6">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={i} className={`mb-6 flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-4 py-3 leading-relaxed max-w-[85%] prose prose-invert prose-p:my-2 prose-pre:my-3 prose-pre:bg-neutral-900 prose-code:before:hidden prose-code:after:hidden
                  ${isUser ? "bg-neutral-900 border border-neutral-800" : "bg-neutral-800/60 border border-neutral-700"}
                `}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}
        {sending && <div className="text-sm text-neutral-400">Thinking…</div>}
        <div ref={bottomRef} />
      </main>

      {/* Composer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-[#0b0b0b]/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none placeholder:text-neutral-500"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={onKeyDown}
              rows={1}
              spellCheck
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-[11px] text-neutral-500">Press Enter to send · Shift+Enter for a new line</div>
        </div>
      </footer>
    </div>
  );
}