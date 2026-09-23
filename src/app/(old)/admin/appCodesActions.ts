"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { assignAllEligible, importCodes, parseCodesCsv } from "@/lib/appStoreCodes";
import { oldHref } from "@/lib/oldHref";

// Admin import of App Store offer codes (Apple's CSV "CODE,REDEEM_URL"). The action checks
// the admin session itself (server actions are callable without the page), imports new
// codes, then gives one to every paid lifetime user who has none yet.
export async function importAppStoreCodes(formData: FormData) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) throw new Error("forbidden");

  const csv = String(formData.get("csv") ?? "");
  const batch = String(formData.get("batch") ?? "").trim().slice(0, 80) || "import";
  const expires = String(formData.get("expires") ?? "").trim();
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expires) ? new Date(`${expires}T00:00:00Z`) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) redirect(oldHref("ru", "/admin?codes=bad-date#app-codes"));
  if (csv.length > 2_000_000) redirect(oldHref("ru", "/admin?codes=too-big#app-codes"));

  const { rows, invalid } = parseCodesCsv(csv);
  const imported = rows.length ? await importCodes(rows, { batch, expiresAt }) : { created: 0, skippedExisting: 0 };
  const assigned = await assignAllEligible();
  const q = new URLSearchParams({
    codes: "ok",
    created: String(imported.created),
    existing: String(imported.skippedExisting),
    invalid: String(invalid),
    assigned: String(assigned.assigned),
    waiting: String(assigned.poolEmptyFor),
  });
  redirect(oldHref("ru", `/admin?${q.toString()}#app-codes`));
}
