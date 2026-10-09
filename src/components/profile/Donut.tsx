/** Accessible SVG donut for platform distribution (values from the user's real collection). */
export function Donut({ parts, total, label }: { parts: { label: string; value: number; color: string }[]; total: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <figure className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
        {parts.map((p) => {
          const len = total ? (p.value / total) * c : 0;
          const el = <circle key={p.label} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
          offset += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fill="#f2eee5" fontSize="24" fontFamily="Inter">{total}</text>
        <text x="70" y="86" textAnchor="middle" fill="#89919d" fontSize="11" fontFamily="Inter">{label}</text>
      </svg>
      <figcaption className="space-y-2 text-sm">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="w-24">{p.label}</span>
            <span className="whitespace-nowrap tabular-nums text-slate">{p.value} ({total ? Math.round((p.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
