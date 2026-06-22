import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Lightweight page-view log for the admin activity history. Only logged-in users
// are recorded (a page view needs an identity to be useful). Fire-and-forget:
// always answers 200 so a tracking blip never disrupts navigation.
export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path.slice(0, 300) : "";
  const title = typeof body?.title === "string" ? body.title.slice(0, 200) : null;
  if (!path || !path.startsWith("/")) return NextResponse.json({ ok: true });

  // Skip noise: admin pages and API hits aren't worth logging.
  if (path.startsWith("/admin") || path.startsWith("/api")) return NextResponse.json({ ok: true });

  try {
    await prisma.pageView.create({ data: { userId: u.id, path, title } });
  } catch {
    /* ignore — tracking must never break the app */
  }
  return NextResponse.json({ ok: true });
}
