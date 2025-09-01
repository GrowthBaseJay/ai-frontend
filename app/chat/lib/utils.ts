import type { Conversation } from "./types";

/* ---------- ids, time, labels ---------- */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
export function now() {
  return Date.now();
}
export function initialsFrom(name?: string | null): string {
  if (!name) return "You";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "You";
}
export function dayLabel(ts: number) {
  const d = new Date(ts);
  const t = new Date();
  const sameDay = d.toDateString() === t.toDateString();
  if (sameDay) return "Today";
  const yesterday = new Date(t);
  yesterday.setDate(t.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}
export function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ---------- UI helpers ---------- */
export function clsx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
export function isAbortError(e: unknown): e is { name?: string } {
  return typeof e === "object" && e !== null && "name" in e && (e as { name?: string }).name === "AbortError";
}
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

/* ---------- localStorage persistence ---------- */
const LS_KEY = "gb.chats.v1";

export function loadConversations(): Conversation[] {
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

export function saveConversations(convs: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(convs));
  } catch {
    // ignore quota errors for MVP
  }
}