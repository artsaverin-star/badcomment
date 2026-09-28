// Search-traffic safety check against a RUNNING build (`next build && next start`, or production).
//
// Takes every URL search engines and language models know about — the sitemaps listed in
// robots.txt of --known (default: production), plus the inapp.pro links inside its /llms.txt,
// /llms-full.txt, /llms-full.ru.txt and /feed.xml — and asks --base for each one, following
// redirects by hand. Then the same for --base's own robots/sitemaps/llms/feed. A URL passes when:
//   • it ends on 200 within 2 hops, every hop permanent (301/308) — except "/" (307, locale);
//   • the final page is indexable (no noindex in X-Robots-Tag or <meta name="robots">);
//   • the final page's canonical is itself (a page listed under another canonical loses it).
// Run it before shipping routing or SEO changes; `--known` = the deployment being replaced.
//
//   node --import tsx scripts/v2/audit/seo-live.ts --base http://localhost:3110
//   node --import tsx scripts/v2/audit/seo-live.ts --base http://localhost:3110 --sample 400
//     (--sample N checks N random URLs of each big sitemap instead of all; default all)
// Read-only (GET). Exit 1 on any failure.

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg("--base", "http://localhost:3000").replace(/\/$/, "");
const KNOWN = arg("--known", "https://inapp.pro").replace(/\/$/, "");
const SAMPLE = Number(arg("--sample", "0"));
const CONCURRENCY = Number(arg("--concurrency", "8"));
const SITE = "https://inapp.pro";

type Result = { url: string; source: string; chain: string[]; final: number; problems: string[] };

async function text(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const siteLinks = (md: string) => [...md.matchAll(/https:\/\/inapp\.pro\/[^\s)<>"']*/g)].map((m) => m[0].replace(/[.,;:]+$/, ""));

function sample<T>(list: T[], n: number): T[] {
  if (!n || list.length <= n) return list;
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function knownUrls(origin: string, label: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const robots = await text(`${origin}/robots.txt`);
  const maps = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1].replace(SITE, origin));
  for (const map of maps) {
    const xml = await text(map).catch(() => "");
    const urls = locs(xml);
    for (const u of sample(urls, SAMPLE)) if (!out.has(u)) out.set(u, `${label} ${map.replace(origin, "")}`);
  }
  for (const file of ["/llms.txt", "/llms-full.txt", "/llms-full.ru.txt", "/feed.xml"]) {
    const body = await text(`${origin}${file}`).catch(() => "");
    for (const u of new Set(siteLinks(body))) if (!out.has(u)) out.set(u, `${label} ${file}`);
  }
  return out;
}

async function check(url: string, source: string): Promise<Result> {
  const problems: string[] = [];
  const chain: string[] = [];
  let current = url.replace(SITE, BASE);
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(current, { redirect: "manual", headers: { "user-agent": "inapp-seo-live/1 (Googlebot-compatible check)", "accept-language": "en" } });
    chain.push(`${res.status}`);
    if (res.status < 300 || res.status >= 400) break;
    const location = res.headers.get("location");
    if (!location) break;
    const path = new URL(current).pathname;
    if (res.status !== 301 && res.status !== 308 && path !== "/") problems.push(`${res.status} is not a permanent redirect (${path})`);
    current = new URL(location, current).toString().replace(SITE, BASE);
    chain.push(current.replace(BASE, ""));
  }
  const final = res?.status ?? 0;
  const hops = chain.filter((c) => /^3/.test(c)).length;
  if (final !== 200) problems.push(`ends on ${final}`);
  if (hops > 2) problems.push(`${hops} redirects`);
  if (final === 200 && res) {
    const robotsHeader = res.headers.get("x-robots-tag") ?? "";
    const type = res.headers.get("content-type") ?? "";
    if (/noindex/i.test(robotsHeader)) problems.push(`X-Robots-Tag: ${robotsHeader}`);
    if (type.includes("text/html")) {
      const html = await res.text();
      const meta = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? "";
      if (/noindex/i.test(meta)) problems.push(`meta robots: ${meta}`);
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
      const finalUrl = current.replace(BASE, SITE);
      if (!canonical) problems.push("no canonical");
      else if (decodeURI(canonical) !== decodeURI(finalUrl.split("#")[0])) problems.push(`canonical ${canonical} ≠ ${finalUrl}`);
    } else {
      await res.arrayBuffer();
    }
  }
  return { url, source, chain, final, problems };
}

async function main() {
  const urls = new Map<string, string>();
  for (const [u, s] of await knownUrls(KNOWN, "known")) urls.set(u, s);
  if (BASE !== KNOWN) for (const [u, s] of await knownUrls(BASE, "base")) if (!urls.has(u)) urls.set(u, s);
  const list = [...urls.entries()];
  console.log(`checking ${list.length} URLs against ${BASE} (sources: ${KNOWN} and ${BASE})`);

  const results: Result[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < list.length) {
        const [url, source] = list[next++];
        results.push(await check(url, source).catch((e) => ({ url, source, chain: [], final: 0, problems: [String(e)] })));
        if (results.length % 250 === 0) console.log(`  … ${results.length}/${list.length}`);
      }
    }),
  );

  const bad = results.filter((r) => r.problems.length);
  const redirected = results.filter((r) => r.chain.length > 1);
  console.log(`\n${results.length} checked · ${redirected.length} redirected · ${bad.length} with problems`);
  const bySource = new Map<string, number>();
  for (const r of bad) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
  for (const [s, n] of bySource) console.log(`  ${n} from ${s}`);
  for (const r of bad.slice(0, 60)) console.log(`  ✗ ${r.url.replace(SITE, "")}  [${r.chain.join(" → ")}]  ${r.problems.join("; ")}  (${r.source})`);
  process.exitCode = bad.length ? 1 : 0;
}

void main();
