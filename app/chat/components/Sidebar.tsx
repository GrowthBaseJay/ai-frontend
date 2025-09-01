"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { Conversation } from "../lib/types";
import { clsx, loadConversations } from "../lib/utils";
import ModelPicker from "./ModelPicker";

export default function Sidebar({
  currentId,
  onSelect,
  onNewChat,
  onDelete,
}: {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}) {
  const [convs, setConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    setConvs(loadConversations().sort((a, b) => b.updatedAt - a.updatedAt));
    // you can add a storage listener if you update from other tabs
  }, []);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 border-r border-[color:var(--gb-border)] bg-[var(--gb-bg)]">
      <div className="h-14 px-3 flex items-center justify-between border-b border-[color:var(--gb-border)]">
        <div className="text-sm text-[color:var(--gb-subtle)]">Conversations</div>
        <button
          onClick={onNewChat}
          className="text-xs px-2 py-1 rounded border border-[color:var(--gb-border)] hover:bg-[color:var(--gb-surface-2)]"
          title="New chat"
        >
          <RotateCcw className="inline-block h-3.5 w-3.5 mr-1" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {convs.map((c) => (
          <div
            key={c.id}
            className={clsx(
              "group rounded-lg border px-2 py-2 cursor-pointer",
              c.id === currentId
                ? "border-[color:var(--gb-border)] bg-[color:var(--gb-surface-2)]"
                : "border-[color:var(--gb-border)]/40 hover:bg-[color:var(--gb-surface)]"
            )}
            onClick={() => onSelect(c.id)}
          >
            <div className="text-[13px] truncate">{c.title || "Untitled"}</div>
            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                className="text-[11px] text-[color:var(--gb-subtle)] hover:text-[color:var(--gb-text)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {convs.length === 0 && (
          <div className="text-xs text-[color:var(--gb-subtle)] px-2">No chats yet</div>
        )}
      </div>

      {/* SSR-safe model selector lives in the footer */}
      <div className="p-3 border-t border-[color:var(--gb-border)]">
        <ModelPicker />
      </div>
    </aside>
  );
}