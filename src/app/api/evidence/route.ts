import { NextResponse } from "next/server";
import { getSegmentEvidence, getAppEvidence } from "@/lib/needsGap";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET /api/evidence — the real reviews behind a need count, loaded on demand so
// the popup can show every matching review without bloating each page render.
//   segment: ?kind=segment&slug=…&need=…&fork=…&app=…
//   app:     ?kind=app&product=…&need=…&fork=…
// fork/app are optional filters; omitting them returns the full count.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const need = url.searchParams.get("need")?.trim();
  const fork = url.searchParams.get("fork")?.trim() || null;

  if (!need) return NextResponse.json({ reviews: [], total: 0 });

  try {
    if (kind === "segment") {
      const slug = url.searchParams.get("slug")?.trim();
      const app = url.searchParams.get("app")?.trim() || null;
      if (!slug) return NextResponse.json({ reviews: [], total: 0 });
      return NextResponse.json(await getSegmentEvidence(slug, need, fork, app));
    }
    if (kind === "app") {
      const product = url.searchParams.get("product")?.trim();
      if (!product) return NextResponse.json({ reviews: [], total: 0 });
      return NextResponse.json(await getAppEvidence(product, need, fork));
    }
    return NextResponse.json({ reviews: [], total: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evidence failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
