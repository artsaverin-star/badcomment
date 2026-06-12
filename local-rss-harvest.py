#!/usr/bin/env python3
# Local Apple RSS review harvester — bypasses prod-box rate limits.
# Usage: python3 local-rss-harvest.py <appleId> <productId> [countries...]
# Writes data/<productId>-reviews.json in the calm-filter-compatible shape.
import json, sys, time, urllib.request

COUNTRIES = ['us','gb','ca','au','de','fr','it','es','nl','br','mx','se','pl','in','ie','nz','za','sg','dk','no']

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

def harvest(apple_id, product_id, countries):
    seen = {}
    for c in countries:
        for sort in ['mostRecent', 'mostHelpful']:
            for page in range(1, 11):
                url = f'https://itunes.apple.com/{c}/rss/customerreviews/page={page}/id={apple_id}/sortby={sort}/json'
                try:
                    d = fetch(url)
                except Exception:
                    break
                entries = (d.get('feed') or {}).get('entry') or []
                if isinstance(entries, dict): entries = [entries]
                # first entry on page 1 is app metadata, skip entries without rating
                got = 0
                for e in entries:
                    rid = ((e.get('id') or {}).get('label')) or ''
                    rating = (e.get('im:rating') or {}).get('label')
                    text = ((e.get('content') or {}).get('label')) or ''
                    if not rid or not rating or not text: continue
                    if rid in seen: continue
                    seen[rid] = {
                        'appId': f'local-{apple_id}',
                        'store': 'apple', 'country': c,
                        'externalId': rid, 'rating': int(rating),
                        'title': ((e.get('title') or {}).get('label')) or '',
                        'text': text,
                        'version': ((e.get('im:version') or {}).get('label')) or None,
                        'postedAt': ((e.get('updated') or {}).get('label')) or None,
                        'author': (((e.get('author') or {}).get('name') or {}).get('label')) or None,
                    }
                    got += 1
                if got == 0: break
                time.sleep(0.4)
        sys.stderr.write(f'  {c}: total {len(seen)}\n')
        if len(seen) >= 3000: break
    out = list(seen.values())
    with open(f'data/{product_id}-reviews.json', 'w') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'{product_id}: {len(out)} reviews')

if __name__ == '__main__':
    apple_id, product_id = sys.argv[1], sys.argv[2]
    countries = sys.argv[3:] or COUNTRIES
    harvest(apple_id, product_id, countries)
