import { getAccess } from "@/lib/access";
import { canAccessReviewCategory } from "@/lib/reviewAccess";
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

  const access = await getAccess();
  if (!canAccessReviewCategory(access, slug)) {
    return Response.json(
      { error: "Paid access required", locked: true },
      { status: access.loggedIn ? 403 : 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const reviews = readReviews(slug, id);
  if (!reviews.length) return Response.json({ error: "Review texts not found" }, { status: 404 });

  return Response.json(
    { reviews },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
