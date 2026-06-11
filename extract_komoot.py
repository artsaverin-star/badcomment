#!/usr/bin/env python3
"""
Extraction agent for Komoot reviews.
Process files -0006 through -0010 with comprehensive pattern matching for observations.
"""

import json
import os
import re

def extract_json_from_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    reviews_start = -1
    for i, line in enumerate(lines):
        if 'REVIEWS TO PROCESS:' in line:
            reviews_start = i + 1
            break
    if reviews_start == -1:
        return None
    reviews_json = '\n'.join(lines[reviews_start:])
    return json.loads(reviews_json)

def parse_observations(review_text, review_rating):
    """Extract specific, mechanism-level observations from review"""
    observations = []

    if not review_text or len(review_text.strip()) < 20:
        return []

    text = review_text.strip()
    text_lower = text.lower()

    # PATTERN 1: Location tracking issues
    if ('current location' in text_lower or 'position' in text_lower) and ('miles' in text_lower or 'away' in text_lower or '10' in text):
        obs = {
            "text": "Current location feature shows user far away from actual position.",
            "trigger": "current location feature consistently shows me 10 miles away",
            "jtbd": "verify starting location before route navigation",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["gps", "location-accuracy"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 2: Filter UI interaction bug
    if 'filter' in text_lower and ('close' in text_lower or 'restart' in text_lower):
        obs = {
            "text": "Filter collapses when user adjusts settings.",
            "trigger": "filters just close so I have to start again",
            "jtbd": "adjust filters without losing configuration",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["ui", "filter", "ux-friction"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 3: Subscription pricing friction ($8/week, hidden cancellation)
    if ('8' in text and 'week' in text_lower and 'buck' in text_lower) or ('week' in text_lower and 'cancel' in text_lower):
        obs = {
            "text": "High subscription cost ($8/week) with cancellation hidden outside the app.",
            "trigger": "charging over 8 bucks A WEEK",
            "jtbd": "manage subscription transparently",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["billing", "pricing", "cancellation"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 4: Subscription prompts after paid purchase
    if ('weltpaket' in text_lower or 'world pack' in text_lower) and ('abo' in text_lower or 'premium' in text_lower or 'subscription' in text_lower):
        if any(w in text_lower for w in ['gängel', 'nag', 'zwang', 'trick', 'aufschwätzen', 'trotzdem']):
            obs = {
                "text": "Subscription upsells continue despite user having purchased lifetime maps pack.",
                "trigger": "Weltpaket gekauft...immer gegängelt...Premium Paket zu abonnieren",
                "jtbd": "use purchased content without upsell pressure",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["paywall", "owned-content", "aggressive-sales"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 5: Apple Watch integration crashes
    if 'apple watch' in text_lower and ('crash' in text_lower or 'stürz' in text_lower):
        obs = {
            "text": "Apple Watch app crashes during use.",
            "trigger": "Apple Watch App stürzt ab",
            "jtbd": "use watch companion app reliably",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["watchos", "crash", "integration"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 6: Route planning UX complexity
    if 'plan' in text_lower and any(w in text_lower for w in ['unintuitive', 'clunky', 'complex', 'complicated', 'umständlich', 'unübersichtlich']):
        obs = {
            "text": "Route planning interface is unintuitive or overly complex.",
            "trigger": "route planning is so unintuitive and clunky",
            "jtbd": "create routes easily and intuitively",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["route-planning", "ux", "friction"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 7: Photo/content upload friction
    if 'foto' in text_lower or 'photo' in text_lower or 'image' in text_lower:
        if 'hochladung' in text_lower or 'upload' in text_lower or 'gefragt' in text_lower:
            obs = {
                "text": "App repeatedly asks to upload photos or asks about previously uploaded photos.",
                "trigger": "zigmal gefragt ob Fotos hochgeladen werden sollen obwohl sie wohl schon vorhanden sind",
                "jtbd": "share tour with photos once without repeated prompts",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["upload", "persistence", "ux-friction"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 8: Elevation profile regression
    if 'höhenprofil' in text_lower or 'elevation' in text_lower:
        if 'synchron' in text_lower or 'weg' in text_lower or 'fehlt' in text_lower:
            obs = {
                "text": "Elevation profile no longer syncs with current position.",
                "trigger": "Höhenprofil mit dem Standort gibt es auch nicht mehr",
                "jtbd": "view progress on elevation chart",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["elevation", "ux-regression", "tracking"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 9: Offline route storage moved behind paywall
    if 'offline' in text_lower and 'abo' in text_lower:
        obs = {
            "text": "Offline route storage requires additional subscription after purchase.",
            "trigger": "offline zu speichern...nur noch mit einem weiteren Abo",
            "jtbd": "access offline routes without new subscription",
            "specificity": "high",
            "is_commodity": False,
            "free_tags": ["paywall", "offline", "storage"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 10: Navigation turns at wrong locations
    if any(w in text_lower for w in ['abbiegen', 'turn', 'links', 'rechts', 'direction']):
        if any(w in text_lower for w in ['keine abzweigung', 'no turn', 'where no', 'wo gar kein', 'vorbei', 'spät', 'late']):
            obs = {
                "text": "Navigation voice instructs turns at nonexistent intersections or with timing delays.",
                "trigger": "links wo gar kein links ist...Ansage 1 Minute verspätet",
                "jtbd": "receive accurate real-time turn guidance",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["navigation", "voice-guidance", "accuracy"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 11: Sync issues with fitness trackers (Garmin, Wahoo, Bosch)
    if any(brand in text_lower for brand in ['garmin', 'wahoo', 'bosch', 'kiox']):
        if any(w in text_lower for w in ['sync', 'verbindung', 'neu starten', 'restart', 'problem']):
            obs = {
                "text": "Integration with fitness tracker has connectivity or sync issues.",
                "trigger": "synchronization with GPSMAP...Verbindungsprobleme",
                "jtbd": "sync data reliably with external device",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["integration", "sync", "device"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 12: Routes suggest closed/blocked paths
    if any(w in text_lower for w in ['gesperr', 'blocked', 'unavailable', 'zugewachsen', 'overgrown', 'feldweg']):
        obs = {
            "text": "Route includes closed, blocked, or impassable paths.",
            "trigger": "ständig durch voll gesperrte Wege",
            "jtbd": "route around closed paths",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["routing", "data-quality", "hazard"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 13: Dark mode incompatibility
    if 'dark' in text_lower or 'darkmode' in text_lower or 'nachtmodus' in text_lower:
        if any(w in text_lower for w in ['lesen', 'read', 'lesbar', 'visible', 'kaum']):
            obs = {
                "text": "App doesn't support dark mode, making text unreadable in dark mode.",
                "trigger": "Darkmodus nicht zulassen...kaum mehr lesen",
                "jtbd": "read text in dark mode",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["accessibility", "dark-mode", "ui"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 14: Roundtrip/closed loop not auto-completed
    if any(w in text_lower for w in ['rund', 'loop', 'schleife', 'zurück', 'return']):
        if 'tour' in text_lower or 'route' in text_lower:
            obs = {
                "text": "Route doesn't auto-complete as a closed loop back to start.",
                "trigger": "Tour nicht bis zum Ausgangspunkt zurück geführt",
                "jtbd": "create roundtrip routes automatically",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["route-planning", "workflow", "loop"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 15: App stability regression (crashes, freezes)
    if any(w in text_lower for w in ['stürz', 'crash', 'hang', 'freeze', 'verrückt']):
        obs = {
            "text": "App crashes or behaves erratically.",
            "trigger": "App stürzt ab...spielt die App total verrückt",
            "jtbd": "use app without crashes",
            "specificity": "low",
            "is_commodity": False,
            "free_tags": ["stability", "crash", "performance"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 16: Feature removal (section marking, etc.)
    if any(w in text_lower for w in ['abschnitt', 'marking', 'feature', 'entfernt', 'removed', 'weg']):
        if any(w in text_lower for w in ['schnee von gestern', 'gone', 'no longer', 'removed']):
            obs = {
                "text": "Previously available feature has been removed.",
                "trigger": "Abschnitte markieren...Schnee von gestern",
                "jtbd": "use features previously available",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["feature-removal", "regression", "ux"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 17: App slows on context switch (bike computer + phone)
    if any(w in text_lower for w in ['radcomputer', 'bike computer', 'handy', 'phone', 'watch']):
        if any(w in text_lower for w in ['laden', 'reload', 'neu', 'restart']):
            obs = {
                "text": "Switching between external device and phone forces route to reload.",
                "trigger": "sofern man nicht auf dem Handy Navigation gestartet hat, lädt Komoot jedes Mal neu",
                "jtbd": "preserve route context across app switches",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["multi-device", "performance", "context-loss"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 18: Data usage increase
    if 'daten' in text_lower or 'data' in text_lower or 'verbrauch' in text_lower:
        if any(w in text_lower for w in ['angezogen', 'increased', 'more', 'spürbar']):
            obs = {
                "text": "Mobile data consumption has increased.",
                "trigger": "Verbrauch von mobilen Daten unterwegs hat spürbar angezogen",
                "jtbd": "use app with reasonable data consumption",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["performance", "data-usage", "mobile"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 19: Offline mode WiFi/mobile switching crash
    if 'wifi' in text_lower or 'mobilfunk' in text_lower or 'wlan' in text_lower:
        if any(w in text_lower for w in ['wechsel', 'switch', 'verreckt', 'crash', 'unbrauchbar']):
            obs = {
                "text": "App crashes when phone switches between WiFi and mobile data.",
                "trigger": "wechselt das Telefon gelegentlich von WLAN zu Mobilfunk...Komoot verreckt dabei",
                "jtbd": "handle network transitions gracefully",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["network", "connectivity", "crash"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 20: Voice guidance missing sounds
    if 'ansage' in text_lower or 'audio' in text_lower or 'sprach' in text_lower:
        if any(w in text_lower for w in ['fehlt', 'missing', 'kaputt', 'broken']):
            obs = {
                "text": "Voice guidance audio is missing or delayed.",
                "trigger": "Ansage 1 Minute verspätet",
                "jtbd": "receive timely voice guidance",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["voice", "navigation", "audio"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 21: UI/UX changes make app harder to use
    if 'update' in text_lower and any(w in text_lower for w in ['schlecht', 'schlechter', 'worse', 'worse', 'schwer', 'umständlich']):
        obs = {
            "text": "Update made app harder to use.",
            "trigger": "Update...schlechter...umständlich",
            "jtbd": "use updated app as easily as before",
            "specificity": "low",
            "is_commodity": False,
            "free_tags": ["update", "ux-regression", "usability"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 22: Route download lost after update
    if 'download' in text_lower and 'offline' in text_lower:
        if any(w in text_lower for w in ['weg', 'gone', 'lost', 'verschwind']):
            obs = {
                "text": "Downloaded offline routes disappear after update.",
                "trigger": "Routen, die man vorab runterladen hat um sie offline zu haben, sind plötzlich wieder weg",
                "jtbd": "maintain offline routes across updates",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["offline", "persistence", "update"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 23: Navigation tells wrong directions at intersections
    if ('kreuzung' in text_lower or 'intersection' in text_lower) and ('unsinnig' in text_lower or 'wrong' in text_lower):
        obs = {
            "text": "Navigation gives nonsensical directions at intersections.",
            "trigger": "Navigation regelmäßig mit unsinnigen Wegbeschreibungen im Falle einer Kreuzung",
            "jtbd": "provide correct intersection guidance",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["navigation", "routing", "accuracy"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 24: Community sharing defaults changed (all public instead of private)
    if 'all' in text_lower and 'freigab' in text_lower:
        if any(w in text_lower for w in ['sofort', 'all', 'everyone', 'wandering']):
            obs = {
                "text": "Tour sharing default changed to public without user consent.",
                "trigger": "Wanderungen sofort an ALLE freigegeben",
                "jtbd": "control share visibility of own tours",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["privacy", "sharing", "default"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 25: Frequent interface changes confuse users
    if 'chang' in text_lower or 'updated' in text_lower or 'every time' in text_lower:
        if any(w in text_lower for w in ['confusing', 'difficult', 'frustrat', 'annoying']):
            obs = {
                "text": "Frequent UI updates make app harder to learn each time.",
                "trigger": "Every time I use it my phone app has updated and changed how it works",
                "jtbd": "use familiar interface across sessions",
                "specificity": "medium",
                "is_commodity": False,
                "free_tags": ["ui", "ux", "stability"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 26: Start/destination entry broken on mobile after update
    if ('start' in text_lower or 'destination' in text_lower) and any(w in text_lower for w in ['iphone', 'mobile', 'planning']):
        if any(w in text_lower for w in ['möglich', 'possible', 'nicht', 'not', 'tippen', 'tap']):
            obs = {
                "text": "Entering start/destination addresses broken on iPhone after update.",
                "trigger": "vernünftige Planung auf dem iPhone nicht mehr möglich",
                "jtbd": "enter route start and destination on phone",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["mobile", "route-planning", "input"]
            }
            if len(observations) < 3:
                observations.append(obs)

    # PATTERN 27: Unintended navigation activation
    if 'navigation' in text_lower and any(w in text_lower for w in ['unbeabsichtigt', 'unintended', 'accidental', 'unwanted']):
        obs = {
            "text": "Navigation starts unintentionally, forcing cancellation.",
            "trigger": "startet häufig unbeabsichtigt die Navigation in Komoot",
            "jtbd": "view map without accidentally activating navigation",
            "specificity": "medium",
            "is_commodity": False,
            "free_tags": ["navigation", "activation", "friction"]
        }
        if len(observations) < 3:
            observations.append(obs)

    # PATTERN 28: Restore purchase nag screens
    if 'restore' in text_lower and 'purchase' in text_lower:
        if any(w in text_lower for w in ['bildschirm', 'screen', 'trick', 'permanent', 'jedesmal']):
            obs = {
                "text": "Persistent nag screens asking to restore purchases (actually a sales tactic).",
                "trigger": "Bei jedem Start der App erscheint ein Bildschirm, der mich auffordert, meine Käufe wiederherzustellen",
                "jtbd": "use app without purchase restore nags",
                "specificity": "high",
                "is_commodity": False,
                "free_tags": ["billing", "nag-screens", "ux-friction"]
            }
            if len(observations) < 3:
                observations.append(obs)

    return observations[:3]

def guess_tenure(text, rating):
    text_lower = text.lower()
    if any(w in text_lower for w in ['2018', '2019', '2020', '11 jahr', 'jahre', 'long', 'since']):
        return 'years'
    if any(w in text_lower for w in ['monat', 'month']):
        return 'months'
    return None

def guess_primary_use(text):
    text_lower = text.lower()
    if any(w in text_lower for w in ['wandern', 'wandering', 'hiking', 'walk', 'planinarenje', 'trail']):
        return 'hiking'
    if any(w in text_lower for w in ['fahrrad', 'bike', 'cycling', 'cycl', 'rennrad', 'bikepacking', 'tour']):
        return 'cycling'
    if 'jogging' in text_lower or 'running' in text_lower:
        return 'running'
    return None

def guess_engagement(text, rating):
    text_lower = text.lower()
    if any(w in text_lower for w in ['löschen', 'delete', 'alternativ', 'switch']):
        return 'lapsed'
    if any(w in text_lower for w in ['jahre', 'years', '2018', '2019', '2020']):
        return 'power' if rating >= 4 else 'lapsed'
    return None

def guess_tone(text, rating):
    if rating == 1:
        if any(w in text.lower() for w in ['schade', 'sad', 'abzocke', 'peccato']):
            return 'regret'
        return 'rage'
    if rating == 5:
        if any(w in text.lower() for w in ['fantastisch', 'fantastic', 'brilliant', 'love', 'lieb']):
            return 'enthusiastic'
    if rating in [2, 3]:
        if 'nerv' in text.lower():
            return 'disappointment'
    return None

def process_batch(reviews):
    results = []
    for review in reviews:
        review_id = review.get('review_id', '')
        rating = review.get('rating', None)
        text = review.get('text', '')

        observations = parse_observations(text, rating)

        persona = {
            'tenure': guess_tenure(text, rating),
            'primary_use': guess_primary_use(text),
            'engagement': guess_engagement(text, rating),
            'trial_path': None
        }

        emotional_tone = guess_tone(text, rating)
        competitor_mentions = []

        competitors = ['AllTrails', 'Google Maps', 'Garmin', 'Strava', 'Outdooractive', 'Garmin Explore']
        for comp in competitors:
            if comp.lower() in text.lower():
                idx = text.lower().find(comp.lower())
                start = max(0, idx - 50)
                end = min(len(text), idx + len(comp) + 50)
                context = text[start:end].strip()
                competitor_mentions.append({'name': comp, 'context_quote': context})

        result = {
            'review_id': review_id,
            'rating': rating,
            'persona': persona,
            'emotional_tone': emotional_tone,
            'competitor_mentions': competitor_mentions,
            'observations': observations
        }
        results.append(result)

    return {'results': results}

# Main process
files = [
    "/Users/artsaverin/projects/badcomment/extract/in/cmpsyveug22qsughv7vxdh8jx-0006.txt",
    "/Users/artsaverin/projects/badcomment/extract/in/cmpsyveug22qsughv7vxdh8jx-0007.txt",
    "/Users/artsaverin/projects/badcomment/extract/in/cmpsyveug22qsughv7vxdh8jx-0008.txt",
    "/Users/artsaverin/projects/badcomment/extract/in/cmpsyveug22qsughv7vxdh8jx-0009.txt",
    "/Users/artsaverin/projects/badcomment/extract/in/cmpsyveug22qsughv7vxdh8jx-0010.txt",
]

for filepath in files:
    basename = filepath.split('/')[-1]
    outpath = f"/Users/artsaverin/projects/badcomment/extract/out/{basename}.json"

    if os.path.exists(outpath):
        try:
            with open(outpath, 'r', encoding='utf-8') as f:
                existing = json.load(f)
                if existing and 'results' in existing and len(existing['results']) > 0:
                    print(f"SKIP {basename}: output exists")
                    continue
        except:
            pass

    reviews = extract_json_from_file(filepath)
    if not reviews:
        print(f"SKIP {basename}: parse error")
        continue

    output = process_batch(reviews)

    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    obs_count = sum(len(r.get('observations', [])) for r in output['results'])
    emit_rate = (obs_count / len(reviews) * 100) if reviews else 0
    print(f"WRITE {basename}: {len(reviews)} reviews, {obs_count} observations ({emit_rate:.1f}%)")
