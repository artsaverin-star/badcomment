import { NextResponse } from "next/server";
import { ingestApp } from "@/lib/ingest";
import type { Store } from "@/lib/scrapers";

export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { store?: string; appId?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const store = body.store as Store;
  const appId = body.appId?.trim();
  const country = (body.country?.trim() || "us").toLowerCase();

  if (store !== "google" && store !== "apple") {
    return NextResponse.json({ error: "store must be 'google' or 'apple'" }, { status: 400 });
  }
  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  try {
    const result = await ingestApp(store, appId, country);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
