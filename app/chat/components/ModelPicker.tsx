"use client";

import { useEffect, useState } from "react";

const MODELS = [
  { id: "gpt-4o-mini", label: "Fast (4o-mini)" },
  { id: "gpt-4o", label: "Balanced (4o)" },
  { id: "gpt-5-think", label: "Reasoning (GPT-5 Thinking)" },
];

export default function ModelPicker() {
  const [model, setModel] = useState<string>(() => localStorage.getItem("gb-model") || MODELS[0].id);

  useEffect(() => {
    localStorage.setItem("gb-model", model);
    // optional: fire a custom event so ChatClient can read it if needed
    window.dispatchEvent(new CustomEvent("gb:model", { detail: model }));
  }, [model]);

  return (
    <label className="block text-[13px] text-[color:var(--gb-subtle)]">
      <span className="mb-1 block">Model</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full rounded-md border border-[color:var(--gb-border)]/60 bg-[var(--gb-bg)] px-2 py-1.5 text-[color:var(--gb-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gb-accent)]"
        aria-label="Model selector"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}