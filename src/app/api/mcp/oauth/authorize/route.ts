import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { createAuthorizationCode, MCP_SCOPE } from "@/lib/mcp/authTokens";
import { clientRegistration, normalizeResource, requestOrigin } from "@/lib/mcp/oauth";
import { recordMcpEvent } from "@/lib/mcp/telemetry";

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
  resource: string;
  scope: string;
};

function readParams(src: URLSearchParams | FormData): Params {
  const get = (key: string) => {
    const value = src.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    clientId: get("client_id"),
    redirectUri: get("redirect_uri"),
    state: get("state"),
    challenge: get("code_challenge"),
    method: get("code_challenge_method"),
    responseType: get("response_type"),
    resource: get("resource"),
    scope: get("scope"),
  };
}

function htmlPage(locale: "ru" | "en", title: string, body: string, status = 200): Response {
  const lang = locale;
  return new Response(
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · inApp</title>
<style>
  body{margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b0e13;color:#f5f5f7;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .card{width:min(420px,calc(100vw - 48px));margin:24px;padding:36px 32px;background:#12161d;border:1px solid #2b3038;border-radius:24px;box-shadow:0 24px 60px -32px rgba(0,0,0,.7)}
  h1{margin:0 0 10px;font-size:24px;letter-spacing:-.02em} p{margin:0;color:#a9adb5;font-size:15px}.client{margin:18px 0 0;padding:14px 16px;border:1px solid #2b3038;border-radius:16px;color:#f5f5f7}.host{display:block;margin-top:2px;color:#8a9099;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
  .row{display:flex;gap:10px;margin-top:26px}button,a.btn{flex:1;padding:12px 18px;border-radius:999px;font-size:15px;font-weight:600;text-align:center;text-decoration:none;cursor:pointer}button{border:0;background:#f5f5f7;color:#111318}a.btn{border:1px solid #343a44;color:#a9adb5;background:transparent}.brand{display:block;margin-bottom:18px;font-weight:800;font-size:19px;letter-spacing:-.02em;color:#f5f5f7}
</style></head><body><div class="card"><span class="brand">inApp</span><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

function errorPage(locale: "ru" | "en", body: string, status = 400) {
  return htmlPage(locale, locale === "ru" ? "Ошибка подключения" : "Connection error", `<p>${esc(body)}</p>`, status);
}

function verifiedClient(p: Params) {
  const registration = clientRegistration(p.clientId);
  if (!registration || !registration.redirectUris.includes(p.redirectUri)) return null;
  return registration;
}

function errorRedirect(p: Params, error: string): Response {
  const url = new URL(p.redirectUri);
  url.searchParams.set("error", error);
  if (p.state) url.searchParams.set("state", p.state);
  return NextResponse.redirect(url, 302);
}

function validRequest(p: Params, origin: string): { resource: string } | null {
  const resource = normalizeResource(p.resource, origin);
  const scopes = p.scope ? p.scope.split(/\s+/).filter(Boolean) : [MCP_SCOPE];
  if (p.responseType !== "code" || !p.challenge || p.method !== "S256" || !resource) return null;
  if (scopes.some((scope) => scope !== MCP_SCOPE)) return null;
  return { resource };
}

export async function GET(req: Request) {
  const locale = await getLocale();
  const url = new URL(req.url);
  const params = readParams(url.searchParams);
  const registration = verifiedClient(params);
  if (!registration) {
    await recordMcpEvent({ event: "oauth_authorize", status: "error", detail: "invalid_client" });
    return errorPage(
      locale,
      locale === "ru"
        ? "Клиент прислал неизвестный client_id или redirect_uri. Удали сервер inApp из редактора и добавь заново."
        : "The client sent an unknown client_id or redirect_uri. Remove inApp from the editor and add it again.",
    );
  }
  const validated = validRequest(params, requestOrigin(req));
  if (!validated) return errorRedirect(params, "invalid_request");

  const user = await getSessionUser();
  if (!user) {
    await recordMcpEvent({ event: "oauth_authorize", status: "login_required", clientName: registration.clientName });
    const packed = Buffer.from(url.search).toString("base64url");
    return NextResponse.redirect(new URL(`/${locale}/mcp/connect?o=${packed}`, requestOrigin(req)), 302);
  }

  const hidden = (
    [
      ["client_id", params.clientId],
      ["redirect_uri", params.redirectUri],
      ["state", params.state],
      ["code_challenge", params.challenge],
      ["code_challenge_method", params.method],
      ["response_type", params.responseType],
      ["resource", validated.resource],
      ["scope", MCP_SCOPE],
    ] as const
  )
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${esc(value)}">`)
    .join("");

  const cancel = new URL(params.redirectUri);
  cancel.searchParams.set("error", "access_denied");
  if (params.state) cancel.searchParams.set("state", params.state);
  const redirectHost = new URL(params.redirectUri).host;
  const title = locale === "ru" ? "Подключить агента?" : "Connect this agent?";
  const body = locale === "ru"
    ? `<p>Клиент сможет читать данные inApp от имени твоего аккаунта. Доступ можно отозвать отдельно на странице MCP.</p><div class="client"><strong>${esc(registration.clientName)}</strong><span class="host">${esc(redirectHost)}</span></div>`
    : `<p>This client will be able to read inApp data on behalf of your account. You can revoke it separately on the MCP page.</p><div class="client"><strong>${esc(registration.clientName)}</strong><span class="host">${esc(redirectHost)}</span></div>`;
  const cancelLabel = locale === "ru" ? "Отмена" : "Cancel";
  const allowLabel = locale === "ru" ? "Разрешить" : "Allow";
  return htmlPage(
    locale,
    title,
    `${body}<form method="post"><div class="row">${hidden}<a class="btn" href="${esc(cancel.toString())}">${cancelLabel}</a><button type="submit">${allowLabel}</button></div></form>`,
  );
}

export async function POST(req: Request) {
  const locale = await getLocale();
  const params = readParams(await req.formData());
  const registration = verifiedClient(params);
  if (!registration) return errorPage(locale, locale === "ru" ? "Неизвестный клиент или адрес возврата." : "Unknown client or redirect URI.");
  const origin = requestOrigin(req);
  const validated = validRequest(params, origin);
  if (!validated) return errorRedirect(params, "invalid_request");

  const user = await getSessionUser();
  if (!user) return errorRedirect(params, "access_denied");

  const code = await createAuthorizationCode({
    userId: user.id,
    clientId: params.clientId,
    clientName: registration.clientName,
    redirectUri: params.redirectUri,
    challenge: params.challenge,
    resource: validated.resource,
    locale,
  });
  await recordMcpEvent({ event: "oauth_consent", userId: user.id, clientName: registration.clientName });

  const target = new URL(params.redirectUri);
  target.searchParams.set("code", code);
  if (params.state) target.searchParams.set("state", params.state);
  target.searchParams.set("iss", origin);
  return NextResponse.redirect(target, 302);
}
