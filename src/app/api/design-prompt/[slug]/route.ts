import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { getIdea } from "@/lib/ideas";
import { buildDesignPrompt } from "@/lib/designPrompt";

export const dynamic = "force-dynamic";

// The design brief of an idea (a paste-into-ChatGPT prompt that renders every
// screen in one design system). Strictly paid: unlike the idea body, there is
// NO free path to it — the daily showcase and the dossier sample stay open as
// reading material, but the working artifact is part of the purchase.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const idea = getIdea(slug);
  if (!idea) return NextResponse.json({ error: "not found" }, { status: 404 });

  const access = await getAccess();
  const allowed =
    access.unlimited ||
    access.has("idea", slug) ||
    access.has("category", idea.category) ||
    access.has("chapter", idea.category) ||
    (access.user ? await ownsDeck(access.user.id) : false);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const brief = buildDesignPrompt(slug);
  if (!brief) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(brief);
}
