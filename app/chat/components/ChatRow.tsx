"use client";

import type { Msg } from "../lib/types";
import { clsx, timeLabel } from "../lib/utils";
import Avatar from "./Avatar";
import MarkdownWithCopy from "./MarkdownWithCopy";

export default function ChatRow({ msg, you }: { msg: Msg; you: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={clsx("flex items-start gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Avatar label="GB" color="emerald" />}
      <div
        className={clsx(
          "max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-6",
          isUser ? "bg-neutral-900" : "bg-neutral-800",
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        ) : (
          <MarkdownWithCopy content={msg.content} />
        )}
        <div className="mt-1 text-[10px] text-neutral-400">{timeLabel(msg.createdAt)}</div>
      </div>
      {isUser && <Avatar label={you} color="indigo" />}
    </div>
  );
}