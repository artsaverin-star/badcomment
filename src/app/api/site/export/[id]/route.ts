import { getViewer } from "@/site/access";
import { contentDisposition } from "@/site/features/ideas/document";
import { buildIdeaExport, EXPORT_NOTE_MAX } from "@/site/features/ideas/export.server";
import { isLocale } from "@/site/i18n/locales";

// «Скачать документ» (spec 02 §7, spec 09 G10):
//   POST /api/site/export/<idea id>  {lang: "ru"|"en"|"de"|"fr"|"ja", note?: string}
//   → 200 text/plain; charset=utf-8, Content-Disposition: attachment (filename rule 02 §7.4),
//     body = the app's document (full category breakdown + the idea + the note, 02 §7.3).
//   401 guest / 403 signed in, when the viewer cannot read the idea (gate before any read);
//   404 unknown id; 400 malformed body; 413 note longer than 20 000 characters.
// The note is the browser's copy (local-first library), so the client sends it.

export const dynamic = "force-dynamic";

const PRIVATE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
/** JSON envelope + a maximal note, with headroom for escaping. */
const MAX_BODY_BYTES = 256_000;

function error(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: PRIVATE });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return error(413, "body too large");
  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return error(413, "body too large");
    body = raw.trim() === "" ? {} : (JSON.parse(raw) as unknown);
  } catch {
    return error(400, "invalid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return error(400, "expected an object");
  const { lang, note = "" } = body as { lang?: unknown; note?: unknown };
  if (!isLocale(lang)) return error(400, "lang must be one of ru, en, de, fr, ja");
  if (typeof note !== "string") return error(400, "note must be a string");
  if (note.length > EXPORT_NOTE_MAX) return error(413, `note longer than ${EXPORT_NOTE_MAX} characters`);

  const result = await buildIdeaExport(lang, id, await getViewer(), note);
  if (!result.ok) return error(result.status, result.error);

  return new Response(result.text, {
    status: 200,
    headers: {
      ...PRIVATE,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": contentDisposition(result.filename, `inApp-${id}.txt`),
      "Content-Language": lang,
    },
  });
}
