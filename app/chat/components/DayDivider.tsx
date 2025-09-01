"use client";

export default function DayDivider({ label }: { label: string }) {
  return (
    <div className="relative my-2 flex items-center justify-center text-[11px] text-neutral-500">
      <div className="w-full border-t border-neutral-900" />
      <span className="absolute bg-black px-2">{label}</span>
    </div>
  );
}