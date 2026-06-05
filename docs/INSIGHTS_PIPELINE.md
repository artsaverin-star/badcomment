# Insights pipeline — runbook

End-to-end recipe for producing the `/product/[id]/insights` page from
qualitative extraction of an app's reviews. Used to ship Calm; same recipe
runs for any product in the DB.

The pipeline does NOT do tag-aggregation. It extracts free-form mechanism-level
observations from every review (1-5★), clusters them by mechanism, groups
clusters into themes, and renders them as story-first rows. Most reviews
yield zero observations — that's correct.

```
ingest → filter (90d window) → extract (per review, via agents)
       → merge → cluster (via agent) → assemble (themes + titles) → page
```

## What it costs

Wall clock per app, sub-agent budget only (no API key):
- Ingest + filter: ~5 min (no LLM)
- Extract: ~1-3 hours (4 parallel sub-agents, 5 batches each)
- Merge: instant
- Cluster: ~10-30 min (1 sub-agent)
- Assemble: instant
- **Total: half a day per app**

For Calm: 892 reviews → 493 observations → 90 clusters → 7 themes.
For smaller apps (200-500 reviews) expect ~50-100 observations and ~20-40 clusters.

## Per-app prerequisites

Two things must exist before running:

1. **DB has the app's reviews**. Use `scripts/lookup-products.ts` to find the
   productId. If we don't have it, run `scripts/calm-ingest.ts <productId>` —
   the script is product-agnostic, name notwithstanding. Skip if reviews are
   already in DB and < 30 days old.

2. **app-context/<slug>.json exists**. Defines the product description,
   pricing, key features, known competitor names. Drives the extract prompt's
   GOOD/BAD examples and the cluster prompt's theme assignments. See
   `app-context/calm.json` as the reference.

## Phase 1 — Ingest

```bash
# On prod (DB lives there):
ssh artsaverin@51.250.11.225 \
  "cd /opt/badcomment && DATABASE_URL='file:/opt/badcomment/data/prod.db' \
   nohup bash -c 'npx tsx scripts/calm-ingest.ts <PRODUCT_ID> > /tmp/<slug>-ingest.log 2>&1' & disown"
```

Pulls all reviews across both stores × 4 countries × all sort modes. ~5-10
minutes for a popular app. Writes `data/<PRODUCT_ID>-reviews.json`.

**Why this matters**: Apple RSS only exposes 500 reviews per (sort, country).
Pulling across multiple sort modes (recent + helpful) and countries doubles
or triples the unique-review yield. Calm: 4 countries × 2 sorts × 500 → 944
unique on Apple GB alone; ~24K raw across all combinations; 8.3K unique after
dedup; 892 after 90-day filter.

SCP locally:
```bash
scp artsaverin@51.250.11.225:/opt/badcomment/data/<PRODUCT_ID>-reviews.json data/
```

## Phase 2 — Filter

```bash
npx tsx scripts/calm-filter.ts <PRODUCT_ID> 90
```

90 = days lookback. Drops anything older + sub-30-char noise + pure
praise/rage one-liners. Writes `data/<PRODUCT_ID>-filtered.json`.

90 days is the sweet spot: captures 1-2 app version cycles, recent enough to
be actionable, small enough to be operationally manageable. 30 days = too
thin to differentiate clusters by count. 180 days = catches resolved
regressions as noise.

## Phase 3 — Extract (the heavy lift)

```bash
npx tsx scripts/calm-extract-prep.ts <PRODUCT_ID> 50
```

Splits filtered reviews into batches of 50, writes self-contained
prompt files to `extract/in/`. Each prompt is ~25KB and is the FULL
extraction template + the batch of reviews as JSON.

Then launch sub-agents to process each batch:

```
Launch 4 agents in parallel, each gets ~5 batch files.
Each agent reads the file, classifies all 50 reviews per the rules in the
prompt, writes JSON output to extract/out/<same-base-name>.json.
```

Sub-agent prompt is fixed boilerplate. See the live conversation in
[../scripts/calm-extract-prep.ts](../scripts/calm-extract-prep.ts) for the
exact dispatch text and the FAT prompt template.

### Calibration

- **Most reviews should return empty observations**. Pure praise, commodity
  billing rage, "doesn't work" without specifics. Expected emit rate: 25-40%.
  Calm came out at 55% (slightly over but still reasonable).
- **Triggers are verbatim**. Every observation must quote an exact substring
  from the review. apply-classify-style verification is built into the
  schema — the trigger has to match. If you can't quote, don't emit.
- **One observation per mechanism**. A review with 2 orthogonal points emits
  2 observations.
- **Persona is free metadata**. tenure/primary_use/engagement/trial_path are
  extracted opportunistically. Many 5★ reviews emit persona-only (no
  observation), which is fine.

### Things that fail at this stage

- **Sub-agent stalls on big prompts**. Once at >400KB it tried to write a
  Python verification script and timed out. Keep prompts <200KB and
  explicitly forbid Python/Bash for "validation" in the dispatch prompt.
- **Rate limits**. Calm extract = 4 agents simultaneously. 6+ hits the
  shared cap. Pace waves if needed.
- **Drift on long batches**. After ~20 batches in one agent the calibration
  drifts (emit rate climbs, specificity drops). Keep ≤5 batches per
  sub-agent.

## Phase 4 — Merge

```bash
npx tsx scripts/calm-extract-merge.ts <PRODUCT_ID>
```

Walks `extract/out/*.json`, validates, flattens into
`data/<PRODUCT_ID>-observations.json` with `flat[]` = (review × observation)
rows for clustering.

Reports the emit rate and persona-signal coverage so you can sanity-check.

## Phase 5 — Cluster

```bash
npx tsx scripts/calm-cluster-prep.ts <PRODUCT_ID>
```

Writes a single self-contained prompt to `cluster/in/<PRODUCT_ID>.txt`. The
prompt contains all non-commodity observations (~200-500 items) and asks for
mechanism-level clusters.

Launch ONE sub-agent:

```
Read cluster/in/<PRODUCT_ID>.txt once.
Output ONE JSON object via Write to cluster/out/<PRODUCT_ID>.json.
CRITICAL: do not write helper scripts. Do not use Bash or Python for
"verification". Read once → think → write once.
```

The cluster prompt outputs clusters with: id (slug), title (Russian,
mechanism-level), novelty, observation_ids, theme. Themes are assigned by
the agent from a fixed list (`payment | content | playback | ui | reliability
| support | strategy`). See [../scripts/calm-cluster-prep.ts](../scripts/calm-cluster-prep.ts)
for the prompt — it includes GOOD/BAD title examples calibrated to plain
Russian (NOT the PM-shorthand that the first iteration produced).

### Lessons baked into the prompt

- **Plain Russian, no English** in titles. First run mixed English/Russian
  like a PM Slack message ("EMDR-квиз обещает clinical-план"). Re-prompt
  with explicit "no Sleep Story, no Premium, no peppy-интро" rule and
  worked examples in plain Russian.
- **One mechanism per title**. First run crammed 3 ideas per title with
  slashes and em-dashes. Re-prompt with "one idea per title".
- **Theme assignment from fixed list**. First run had no themes at all.
  Re-prompt with the 7-theme taxonomy and examples of cluster → theme
  mapping.

### Recovery from failures

- Agent stalls (no progress for 600s): re-prep with smaller prompt (drop
  lookup tables, keep only observation text). Re-launch.
- Agent produces too few clusters (<15): prompt says "lean toward MORE
  clusters, not fewer" — reinforce.
- Agent produces 100+ clusters: titles will be too granular; ask for
  consolidation pass.

## Phase 6 — Assemble

```bash
npx tsx scripts/calm-assemble.ts <PRODUCT_ID>
```

Reads cluster output + observations + filtered reviews, builds insights with
verbatim quote evidence for each cluster (deduped by review_id, sorted by
specificity). Updates `src/data/insights.json` — replaces the entry for this
productId, leaves others untouched.

Title rewrites and theme assignments are NOT applied in assemble anymore
(they're embedded in the cluster prompt). Assemble's job is mechanical:
emit the page-shape JSON.

## Phase 7 — Inspect & deploy

```bash
# Local check:
npm run dev
# open http://localhost:3000/product/<PRODUCT_ID>/insights

# Deploy:
git add src/data/insights.json
git commit -m "..."
git push
ssh artsaverin@51.250.11.225 "cd /opt/badcomment && git pull --ff-only && npm run build && sudo systemctl restart badcomment"
```

If a few titles still read badly, hand-fix them in `src/data/insights.json`
directly. If the theme list is wrong, re-categorise in the assemble script's
override map.

## Per-app context

`app-context/<slug>.json` carries the bits the prompts need that aren't in
the DB. Schema:

```json
{
  "productId": "cmpstwzc422tyug8p31xzftzd",
  "slug": "calm",
  "name": "Calm",
  "domain": "медитация / mindfulness / сон",
  "oneLiner": "медитация/осознанность/сон, iOS+Android",
  "pricing": "~$70/year Premium, 7-day free trial, есть Lifetime tier",
  "keyFeatures": [
    "guided meditations",
    "Sleep Stories",
    "soundscapes/music",
    "breathing exercises",
    "Daily Calm",
    "Calm Kids",
    "Calm Body"
  ],
  "competitors": ["Headspace", "Insight Timer", "Aura", "Waking Up", "Balance"],
  "goodObservationExamples": [
    {"trigger": "...verbatim span from a real Calm review...",
     "observation": "...mechanism-level note in plain Russian..."}
  ],
  "badObservationExamples": [
    "User says it's too expensive (commodity)",
    "User says it crashed (no specifics)",
    "..."
  ]
}
```

The extract-prep and cluster-prep scripts read this file to template the
prompts. Without it, the prompts are too generic and emit rate drifts.

## What's still manual per app

After all the automation:
- **Sub-agent dispatch** (manual: launch 4 agents per phase, wait for
  notifications). Eventually replace with API-direct when token is wired up.
- **Quality check** of cluster titles and theme assignments. With the
  improved cluster prompt this should be a quick read, not a 90-rewrite
  session.
- **Theme list** is currently fixed at 7 categories tuned for wellness apps
  (Calm, Headspace, Sleep Cycle, etc.). For a finance app or a game it'd be
  a different list — update `THEME_LABEL` / `THEME_ORDER` in
  `src/lib/insights.ts` per domain.

## Known limits

- **No 5★ astroturf filter**. The pipeline trusts that 1-5★ reviews are all
  written by real users. Calm spot-checked OK; if a class of apps reads
  like SEO bots, we'd need a pre-filter.
- **Russian-only output**. The cluster prompt forces Russian titles. For
  English output the prompt has to be rewritten (not just translated — the
  good/bad examples must be in the target language).
- **Single-product scope per run**. To compare two apps you run the
  pipeline twice and compare pages manually. Cross-app aggregation is
  future work.

## File map

```
docs/INSIGHTS_PIPELINE.md   ← this file
app-context/<slug>.json     ← per-app context fed into prompts

scripts/calm-ingest.ts          (rename target: app-ingest.ts)
scripts/calm-filter.ts          (rename target: app-filter.ts)
scripts/calm-extract-prep.ts    (rename target: app-extract-prep.ts)
scripts/calm-extract-merge.ts   (rename target: app-extract-merge.ts)
scripts/calm-cluster-prep.ts    (rename target: app-cluster-prep.ts)
scripts/calm-assemble.ts        (rename target: app-assemble.ts)

data/<productId>-reviews.json       ingest output
data/<productId>-filtered.json      filter output
data/<productId>-observations.json  merge output

extract/in/<productId>-NNNN.txt     extract agent inputs
extract/out/<productId>-NNNN.json   extract agent outputs

cluster/in/<productId>.txt          cluster agent input
cluster/out/<productId>.json        cluster agent output

src/data/insights.json              page data (multiple products in one file)
src/lib/insights.ts                 types + theme labels
src/app/product/[id]/insights/page.tsx       the page itself
src/components/InsightRow.tsx                a single row card
```
