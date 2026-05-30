"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  store: "google" | "apple";
  storeAppId: string;
  title: string;
  icon: string | null;
  developer: string | null;
};

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function analyze(r: Result) {
    setAnalyzingId(r.storeAppId);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: r.store, appId: r.storeAppId, country: "us" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");
      router.push(`/product/${data.productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed");
      setAnalyzingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search an app by name, e.g. Spotify"
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li
              key={r.storeAppId}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
            >
              {r.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.icon} alt="" className="h-10 w-10 rounded-lg" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-black/10 dark:bg-white/10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title}</p>
                {r.developer && (
                  <p className="truncate text-sm text-neutral-500">{r.developer}</p>
                )}
              </div>
              <button
                onClick={() => analyze(r)}
                disabled={analyzingId !== null}
                className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {analyzingId === r.storeAppId ? "Analyzing…" : "Analyze"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
