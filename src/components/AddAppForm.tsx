"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddAppForm() {
  const router = useRouter();
  const [store, setStore] = useState<"google" | "apple">("google");
  const [appId, setAppId] = useState("");
  const [country, setCountry] = useState("us");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, appId, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage(
        `"${data.title}": fetched ${data.fetched}, negative ${data.negative}, stored ${data.stored}`
      );
      setAppId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-neutral-500">Store</span>
          <select
            value={store}
            onChange={(e) => setStore(e.target.value as "google" | "apple")}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
          >
            <option value="google">Google Play</option>
            <option value="apple">App Store</option>
          </select>
        </label>
        <label className="flex flex-1 flex-col text-sm">
          <span className="mb-1 text-neutral-500">
            {store === "google" ? "Package (com.app.name)" : "Numeric app id"}
          </span>
          <input
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder={store === "google" ? "com.spotify.music" : "324684580"}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-neutral-500">Country</span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-20 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Scraping…" : "Analyze"}
        </button>
      </div>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
