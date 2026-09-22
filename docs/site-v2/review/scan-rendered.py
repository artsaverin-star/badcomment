#!/usr/bin/env python3
"""Rendered-page localization scan for the new site (review/i18n-quality.md).

Fetches pages of the shared dev server (default http://localhost:3210) for de, fr, ja (and
en/ru sanity), strips <script>/<style>, and reports:
  * Cyrillic in visible text, in user-facing attributes (aria-label, alt, title, placeholder,
    <meta content>) and in <title>;
  * typography: straight quotes in text, "..." instead of "…", French punctuation (: ; ! ? » «)
    without a no-break space, wrong quote style per locale;
  * <html lang> value.
Read-only (GET requests only).  Usage: python3 scan-rendered.py [base_url] [--verbose]
"""
import html
import re
import sys
import urllib.request
from html.parser import HTMLParser

BASE = next((a for a in sys.argv[1:] if a.startswith("http")), "http://localhost:3210")
VERBOSE = "--verbose" in sys.argv

PATHS = [
    "", "/segment", "/segment/interior-design", "/segment/habit-tracking", "/segment?q=zzzz",
    "/ideas", "/ideas/interior-design-1", "/ideas/habit-tracking-1", "/saved", "/settings",
    "/settings/about", "/plus", "/welcome", "/login", "/library?checkout=test",
    "/contacts", "/offer", "/offer/payment", "/privacy", "/no-such-page-xyz",
]
LOCALES = [a for a in sys.argv[1:] if a in ("ru", "en", "de", "fr", "ja")] or ["de", "fr", "ja", "en"]
CYR = re.compile(r"[А-Яа-яЁё]")
ATTRS = {"aria-label", "alt", "title", "placeholder", "content", "aria-description", "data-label"}


class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.text = []
        self.attrs = []
        self.title = ""
        self.in_title = False
        self.lang = None

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "template"):
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag == "html":
            self.lang = dict(attrs).get("lang")
        for k, v in attrs:
            if k in ATTRS and v:
                if tag == "meta" and k == "content":
                    name = dict(attrs).get("name") or dict(attrs).get("property") or ""
                    if not re.search(r"description|title|og:|twitter:", name) or re.search(r"image|url|type|locale|card|site_name", name):
                        continue
                self.attrs.append((tag, k, v))

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "template") and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.skip:
            return
        s = data.strip()
        if s:
            self.text.append(s)


def fetch(url):
    req = urllib.request.Request(url, headers={"Accept-Language": "en", "User-Agent": "i18n-review"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.status, r.geturl(), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, url, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, url, str(e)


def typography(locale, chunks):
    out = []
    for c in chunks:
        if '"' in c and not c.startswith("{"):
            out.append(("straight-double-quote", c))
        if re.search(r"(?<![a-z])'(?![a-z])|[a-zA-Z]'[a-zA-Z]", c) and locale in ("en", "fr"):
            out.append(("straight-apostrophe", c))
        if "..." in c:
            out.append(("three-dots", c))
        if locale == "fr":
            if re.search(r"[^\s\u00a0\u202f][;:!?»](?!\w)", c) and not re.search(r"https?:|\d:\d", c):
                out.append(("fr-no-space-before-punct", c))
            if re.search(r" [;:!?»]", c):
                out.append(("fr-plain-space-before-punct", c))
            if re.search(r"« ", c):
                out.append(("fr-plain-space-after-«", c))
            if "“" in c or "„" in c:
                out.append(("fr-english/german-quotes", c))
        if locale == "de":
            if "«" in c or "»" in c:
                out.append(("de-guillemets", c))
            if re.search(r"“[^“”]*”", c):
                out.append(("de-english-quotes", c))
        if locale == "ja":
            if "«" in c or "“" in c:
                out.append(("ja-western-quotes", c))
        if locale == "en":
            if "«" in c or "„" in c:
                out.append(("en-foreign-quotes", c))
    return out


def main():
    total = 0
    for L in LOCALES:
        for p in PATHS:
            url = f"{BASE}/{L}{p}"
            status, final, body = fetch(url)
            ex = Extract()
            try:
                ex.feed(body)
            except Exception:  # noqa: BLE001
                pass
            cyr_text = [t for t in ex.text if CYR.search(t)]
            cyr_attr = [(tag, k, v) for tag, k, v in ex.attrs if CYR.search(v)]
            cyr_title = ex.title if CYR.search(ex.title) else ""
            typo = typography(L, ex.text + [v for _, _, v in ex.attrs])
            flag = bool(cyr_text or cyr_attr or cyr_title or (ex.lang and ex.lang != L))
            print(f"\n## {L}{p or '/'}  [{status}] -> {final.replace(BASE, '')}  lang={ex.lang}  text-chunks={len(ex.text)}")
            if ex.lang and ex.lang != L:
                print(f"  ! <html lang={ex.lang}> on a /{L} page")
            if cyr_title:
                print(f"  ! CYRILLIC <title>: {cyr_title!r}")
            for t in cyr_text[:40]:
                print(f"  ! CYRILLIC text: {t[:160]!r}")
            if len(cyr_text) > 40:
                print(f"  ! … {len(cyr_text) - 40} more Cyrillic text chunks")
            for tag, k, v in cyr_attr[:20]:
                print(f"  ! CYRILLIC <{tag} {k}>: {v[:160]!r}")
            seen = set()
            for kind, c in typo:
                key = (kind, c[:80])
                if key in seen:
                    continue
                seen.add(key)
                if VERBOSE or kind not in ("straight-apostrophe",):
                    print(f"  ~ {kind}: {c[:160]!r}")
            total += flag
    print(f"\npages with Cyrillic / wrong lang: {total}")


if __name__ == "__main__":
    main()
