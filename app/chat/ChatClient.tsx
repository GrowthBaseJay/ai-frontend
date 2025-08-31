"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

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
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: text }],
          userId,
        }),
      });

      const data = await res.json();
      const reply: string =
        typeof data?.reply === "string" ? data.reply : "Sorry, I didn’t get that.";
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 border-b border-neutral-800 bg-black/80 backdrop-blur flex items-center justify-center px-4">
        <div className="w-full max-w-3xl flex items-center justify-between">
          <div className="font-semibold tracking-tight">GrowthBase AI</div>
          <div className="text-xs text-neutral-400">Signed in</div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[700px] rounded-2xl px-4 py-3 leading-relaxed ${
                    isUser
                      ? "bg-neutral-900 text-neutral-100 border border-neutral-800"
                      : "bg-neutral-800/70 text-neutral-100 border border-neutral-700"
                  }`}
                >
                  {/* Role label */}
                  <div
                    className={`text-[10px] uppercase tracking-wide mb-2 ${
                      isUser ? "text-blue-300" : "text-emerald-300"
                    }`}
                  >
                    {isUser ? "You" : "Assistant"}
                  </div>

                  {/* Markdown content */}
                  <div className="prose prose-invert prose-pre:bg-transparent prose-pre:p-0 prose-code:before:hidden prose-code:after:hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeHighlight]}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="mb-5 flex justify-start">
              <div className="text-sm text-neutral-400">Thinking…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <footer className="sticky bottom-0 bg-black border-t border-neutral-800">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 focus-within:border-neutral-600 transition">
            <textarea
              className="w-full resize-none bg-transparent outline-none text-sm placeholder-neutral-500 px-4 py-3"
              rows={1}
              placeholder="Type a message… (Enter to send, Shift+Enter for a new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="h-9 px-4 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}