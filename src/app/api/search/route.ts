import { NextResponse } from "next/server";
import { searchApps } from "@/lib/scrapers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/search?q=spotify&country=us — App Store search (Google Play's
// scraper search is broken upstream, so name search is Apple-only for now).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const country = (url.searchParams.get("country")?.trim() || "us").toLowerCase();

  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchApps(q, country, 12);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
