import { NextResponse } from "next/server";
import { getLocale } from "@/lib/i18n.server";
import { getCatalogData } from "@/lib/catalogData";

export const dynamic = "force-dynamic";

// Paginated apps for the «Приложения» infinite scroll. The list is the same for
// everyone (the per-app free/premium flag is viewer-independent), so premium=false.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(120, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "60", 10) || 60));
  const locale = await getLocale();
  const { catalogApps } = getCatalogData(locale, false);
  return NextResponse.json({ apps: catalogApps.slice(offset, offset + limit), total: catalogApps.length });
}
