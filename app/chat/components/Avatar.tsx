"use client";
import { clsx } from "../lib/utils";

export default function Avatar({
  label,
  color = "indigo",
}: {
  label: string;
  color?: "indigo" | "emerald" | "neutral";
}) {
  const colorMap = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    neutral: "bg-neutral-600",
  } as const;

  return (
    <div className={clsx("h-7 w-7 rounded-full grid place-items-center text-[11px] font-semibold", colorMap[color])}>
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}