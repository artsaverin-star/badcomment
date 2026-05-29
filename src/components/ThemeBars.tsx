import type { ThemeStat } from "@/lib/queries";

export default function ThemeBars({ stats }: { stats: ThemeStat[] }) {
  if (stats.length === 0) {
    return <p className="text-sm text-neutral-500">No complaint themes detected yet.</p>;
  }
  const max = stats[0].count;
  return (
    <ul className="flex flex-col gap-2">
      {stats.map((s) => (
        <li key={s.key} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm">{s.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded bg-red-500"
              style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-neutral-500">
            {s.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
