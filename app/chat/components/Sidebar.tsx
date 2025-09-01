"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { loadConversations, saveConversations, clsx } from "../lib/utils";
import type { Conversation } from "../lib/types";
import ModelPicker from "./ModelPicker";

export default function Sidebar() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => { setConvs(loadConversations()); }, []);
  useEffect(() => { if (convs.length) saveConversations(convs); }, [convs]);

  function newChat() {
    const now = Date.now();
    const convo: Conversation = {
      id: crypto.randomUUID(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    const next = [convo, ...convs];
    setConvs(next);
    saveConversations(next);
    // navigation is handled in ChatClient by recently updated sort
  }

  function startEdit(id: string, title: string) {
    setEditingId(id);
    setDraft(title);
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }
  function commitEdit(id: string) {
    setConvs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: draft || "Untitled", updatedAt: Date.now() } : c))
    );
    cancelEdit();
  }
  function remove(id: string) {
    if (!confirm("Delete this conversation?")) return;
    setConvs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <aside className="hidden lg:block">
      <div
        className="fixed left-0 top-14 z-40 h-[calc(100dvh-56px)] w-72 border-r border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)]"
        aria-label="sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Top */}
          <div className="border-b border-[color:var(--gb-border)]/60 p-3">
            <button
              onClick={newChat}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-[color:var(--gb-border)]/60 px-3 py-2 text-sm hover:border-[color:var(--gb-accent)]/70"
            >
              <Plus className="h-4 w-4" />
              New chat
            </button>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1">
            {convs.length === 0 && (
              <div className="text-sm text-[color:var(--gb-subtle)]">Conversations will appear here</div>
            )}
            {convs.map((c) => (
              <div
                key={c.id}
                className={clsx(
                  "group flex items-center justify-between rounded-md border border-transparent px-2 py-2 hover:border-[color:var(--gb-border)]/60"
                )}
              >
                {editingId === c.id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitEdit(c.id); if (e.key === "Escape") cancelEdit(); }}
                    className="w-full rounded-sm bg-transparent outline-none"
                    aria-label="Conversation title"
                  />
                ) : (
                  <div className="truncate text-[13px]" title={c.title}>
                    {c.title || "Untitled"}
                  </div>
                )}
                <div className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {editingId === c.id ? (
                    <>
                      <button className="rounded p-1 hover:bg-[color:var(--gb-surface)]" onClick={() => commitEdit(c.id)} aria-label="Save name">
                        <Check className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1 hover:bg-[color:var(--gb-surface)]" onClick={cancelEdit} aria-label="Cancel rename">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="rounded p-1 hover:bg-[color:var(--gb-surface)]" onClick={() => startEdit(c.id, c.title)} aria-label="Rename">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1 hover:bg-[color:var(--gb-surface)]" onClick={() => remove(c.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom model picker */}
          <div className="border-t border-[color:var(--gb-border)]/60 p-3 text-sm">
            <ModelPicker />
          </div>
        </div>
      </div>
    </aside>
  );
}