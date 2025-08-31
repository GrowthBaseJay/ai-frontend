"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

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
        body: JSON.stringify({ messages: [...messages, { role: "user", content: text }], userId }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I didn’t get that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: "Error contacting AI." }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-black text-white">
      <header className="h-14 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="font-semibold">GrowthBase AI</div>
      </header>

      <section className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className="mb-4">
            <div className={`text-xs uppercase tracking-wide mb-1 ${m.role === "user" ? "text-blue-300" : "text-emerald-300"}`}>
              {m.role}
            </div>
            <div className={`rounded-2xl p-3 ${m.role === "user" ? "bg-neutral-900" : "bg-neutral-800"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="mb-4 text-neutral-400 text-sm">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </section>

      <footer className="w-full border-t border-neutral-800">
        <div className="max-w-3xl mx-auto p-3 flex gap-2">
          <input
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 outline-none"
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={sending}
            className="bg-white text-black px-4 py-2 rounded-xl disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  );
}