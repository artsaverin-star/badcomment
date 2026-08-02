import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { clientRedirectUris, mintCode, requestOrigin } from "@/lib/mcp/oauth";

// The OAuth authorization endpoint. Opened in a real browser by the MCP client:
// signed-out users are bounced to the site's sign-in bridge (/mcp/connect),
// signed-in users see a one-button consent card. Approving mints a short-lived
// signed code; the token endpoint swaps it for the personal MCP key.

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Params = {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  method: string;
  responseType: string;
};

function readParams(src: URLSearchParams | FormData): Params {
  const g = (k: string) => {
    const v = src.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    clientId: g("client_id"),
    redirectUri: g("redirect_uri"),
    state: g("state"),
    challenge: g("code_challenge"),
    method: g("code_challenge_method"),
    responseType: g("response_type"),
  };
}

/** Validate client_id + redirect_uri. Returns an error page response, or null when valid. */
function validateClient(p: Params): Response | null {
  const uris = clientRedirectUris(p.clientId);
  if (!uris || !uris.includes(p.redirectUri)) {
    // Never redirect to an unverified URI — render the error instead.
    return page(
      "Ошибка подключения",
      "Клиент прислал неизвестный client_id или redirect_uri. Попробуй удалить и заново добавить сервер inApp в своём редакторе.",
      400,
    );
  }
  return null;
}

function errRedirect(p: Params, error: string): Response {
  const u = new URL(p.redirectUri);
  u.searchParams.set("error", error);
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u, 302);
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · inApp</title>
<style>
  body{margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafafa;color:#1d1d1f;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .card{max-width:400px;margin:24px;padding:36px 32px;background:#fff;border:1px solid #e5e5e7;border-radius:24px;box-shadow:0 24px 60px -32px rgba(0,0,0,.25)}
  h1{margin:0 0 10px;font-size:22px;letter-spacing:-.02em}
  p{margin:0;color:#6e6e73;font-size:15px}
  .row{display:flex;gap:10px;margin-top:26px}
  button,a.btn{flex:1;padding:12px 18px;border-radius:999px;font-size:15px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}
  button{border:0;background:#1d1d1f;color:#fff}
  a.btn{border:1px solid #e5e5e7;color:#6e6e73;background:#fff}
  .brand{display:block;margin-bottom:18px;font-weight:800;font-size:19px;letter-spacing:-.02em;color:#1d1d1f}
</style></head><body><div class="card"><span class="brand">inApp</span><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = readParams(url.searchParams);
  const invalid = validateClient(p);
  if (invalid) return invalid;
  if (p.responseType !== "code" || !p.challenge || p.method !== "S256") {
    return errRedirect(p, "invalid_request");
  }

  const user = await getSessionUser();
  if (!user) {
    // Sign in on the regular site first, then come back here with the session.
    const back = Buffer.from(url.search).toString("base64url");
    return NextResponse.redirect(new URL(`/ru/mcp/connect?o=${back}`, requestOrigin(req)), 302);
  }

  const hidden = (
    [
      ["client_id", p.clientId],
      ["redirect_uri", p.redirectUri],
      ["state", p.state],
      ["code_challenge", p.challenge],
      ["code_challenge_method", p.method],
      ["response_type", p.responseType],
    ] as const
  )
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
    .join("");

  const cancel = new URL(p.redirectUri);
  cancel.searchParams.set("error", "access_denied");
  if (p.state) cancel.searchParams.set("state", p.state);

  return page(
    "Подключить агента?",
    `<p>Редактор запрашивает доступ к данным inApp от имени твоего аккаунта. Он сможет читать разборы, рейтинг, отзывы и идеи, которые открыты аккаунту.</p>
     <form method="post"><div class="row">${hidden}<a class="btn" href="${esc(cancel.toString())}">Отмена</a><button type="submit">Разрешить</button></div></form>`,
  );
}

export async function POST(req: Request) {
  const p = readParams(await req.formData());
  const invalid = validateClient(p);
  if (invalid) return invalid;
  if (p.responseType !== "code" || !p.challenge || p.method !== "S256") {
    return errRedirect(p, "invalid_request");
  }

  const user = await getSessionUser();
  if (!user) return errRedirect(p, "access_denied");

  const u = new URL(p.redirectUri);
  u.searchParams.set("code", mintCode(user.id, p.clientId, p.redirectUri, p.challenge));
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u, 302);
}
