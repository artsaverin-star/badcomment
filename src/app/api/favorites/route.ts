import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Server-side favorites for a logged-in user. GET returns their slugs; POST
// with {slugs} merges the client's localStorage list in and returns the union
// (login-time sync); POST with {slug,on} toggles one. Guests get an empty list
// and their POSTs are no-ops (localStorage still holds their bookmarks).
export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ slugs: [] });
  const rows = await prisma.favorite.findMany({ where: { userId: u.id }, select: { slug: true } });
  return NextResponse.json({ slugs: rows.map((r) => r.slug) });
}

export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ slugs: [] });
  const body = await req.json().catch(() => ({}));

  // Bulk merge (sync localStorage -> server on login).
  if (Array.isArray(body.slugs)) {
    const slugs = (body.slugs as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 2000);
    // SQLite createMany has no skipDuplicates; upsert each (unique userId+slug).
    for (const slug of slugs) {
      await prisma.favorite.upsert({
        where: { userId_slug: { userId: u.id, slug } },
        create: { userId: u.id, slug },
        update: {},
      });
    }
    const rows = await prisma.favorite.findMany({ where: { userId: u.id }, select: { slug: true } });
    return NextResponse.json({ slugs: rows.map((r) => r.slug) });
  }

  // Single toggle.
  const slug = typeof body.slug === "string" ? body.slug : null;
  if (!slug) return NextResponse.json({ error: "no slug" }, { status: 400 });
  if (body.on === false) {
    await prisma.favorite.deleteMany({ where: { userId: u.id, slug } });
  } else {
    await prisma.favorite.upsert({
      where: { userId_slug: { userId: u.id, slug } },
      create: { userId: u.id, slug },
      update: {},
    });
  }
  return NextResponse.json({ ok: true });
}
