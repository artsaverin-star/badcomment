import { getApp, readReviews } from "@/lib/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const app = getApp(slug, id);
  if (!app) return Response.json({ error: "Review app not found" }, { status: 404 });

  const reviews = readReviews(slug, id);
  if (!reviews.length) return Response.json({ error: "Review texts not found" }, { status: 404 });

  return Response.json(
    { reviews },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } },
  );
}
