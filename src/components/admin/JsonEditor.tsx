"use client";
import { useState } from "react";

/** Small JSON field with validation feedback, used for condition configs and theme params. */
export function JsonEditor({ value, onChange, rows = 6, label }: { value: unknown; onChange: (v: unknown) => void; rows?: number; label: string }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        rows={rows}
        className="field font-mono text-xs"
        value={text}
        aria-label={label}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setErr(null);
          } catch (x) {
            setErr((x as Error).message);
          }
        }}
      />
      {err && <p className="mt-1 text-xs text-[#ff9a92]">{err}</p>}
    </div>
  );
}
