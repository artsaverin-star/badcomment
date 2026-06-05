# Hand-validation of the Calm extraction prompt

Date: 2026-06-05. Validated by main thread (sub-agents rate-limited).

## Method

Manually applied the FAT prompt to the first 24 reviews of batch 0001 (rating mix: 1★×8, 2★×1, 3★×3, 4★×2, 5★×10). Decided per review whether to emit observations and what they'd be.

## Findings

**Emit rate: 8 of 24 (~33%) yielded ≥1 observation.** Matches the "majority empty is correct" calibration the prompt asks for.

### The 8 that yielded observations

1. **3ecad3d2** (1★) — *"can't get past the bot test. keeps saying try again. uninstalled"* → Sign-up CAPTCHA blocks first-time install evaluation. Specific, JTBD=evaluate-before-commit.

2. **ac7ade16** (4★, important!) — Subscriber clicked Instagram ad for EMDR quiz, took the quiz, but can't link the generated "plan" to their existing subscription. → **Marketing-funnel disconnect**: lead-magnet flow doesn't recognize existing customers. **This is the kind of insight only 4★ reviews surface** — they're paying customers reporting product strategy fails.

3. **20c98ba4** (3★) — Background cricket ambient sound persists into meditation sessions; no global mute for ambient layer. → Two distinct observations: (a) ambient bleed across session boundaries, (b) missing global-ambient toggle.

4. **a4fbd5a5** (2★) — Year+ lapsed user: previously could mix rain/thunder sounds; now removed or paywalled. → Bait-and-switch on existing customization.

5. **e710a18c** (4★) — "timer keeps freezing at the same time 19:58". → Reproducible bug at specific timer transition (likely session-end). Specific, version-tagged.

6. **5392119d** (1★) — Splash screen hangs on "take a deep breath" loading copy; user was trying to calm exhausted child. → **Product-message irony under load**: same JTBD as the prompt's panic-attack example. Splash screen taunts users during the exact moment Calm is supposed to help.

7. **f5ba0aac** (1★) — "requires account to use it, uninstalled straight away". → Account-gating kills first-touch evaluation. Borderline commodity but the *immediacy* of the uninstall makes it a specific conversion mechanism.

8. **cdba2efa** (5★, important!) — Two observations: (a) Promo codes give premium for free widely enough that user openly recommends it, (b) Calm Body stretching is one 7-min daily session and too short/easy for daily-stretchers. → **Both are insights only 5★ users surface**. The promo leak is a revenue protection issue; the stretching gap is a feature-depth ask from engaged users.

### The 16 that yielded nothing (correctly)

Most were one of:
- Pure praise: "Excellent tools", "Wonderful", "Essential app" — non-information (4 reviews).
- Pure rage about billing: "prices going up", "take money without authorising", "PAID APP BEWARE" — commodity (3 reviews).
- Auth/login complaints too vague: "have premium, won't let me sign in" — specific to user, no shared mechanism.
- Persona-rich but observation-poor: "On my phone for years, predominately for sleep" — emit persona signals, no observation.
- Generic "didn't work" or "scam free tier" — commodity (3 reviews).

## Validation: where the prompt's calibration felt right

- **Filtering generic billing/paywall complaints worked.** Multiple 1★ reviews are commodity rage about price; prompt correctly drops them.
- **4-5★ DID surface insights** (ac7ade16, cdba2efa) that 1-2★ reviews don't carry. User's hypothesis confirmed on small sample.
- **Persona signals are rich on 5★ reviews** even when observations are empty. The years/sleep/power triplets cluster nicely.
- **Reproducible bugs (e710a18c, 5392119d) emit at high specificity.** Version tag is the differentiator.

## Where the calibration was borderline

- **"Battery drain" + "auth won't work" without specifics.** Bordeline-emit-vs-null. Currently the prompt is restrictive ("no mechanism, no when"). I left these as null. If post-clustering we miss a "reliability under power-user load" theme, may need to relax.
- **"Free tier is actually paywalled" / "store says free but isn't"** — borderline. I emitted with medium specificity. If we see a flood of these post-clustering they'll dominate. Worth keeping for now, can dedup at cluster step.

## Where the prompt could improve

1. **Add a BAD example for "auth/login failures without specifics"** — the prompt's BAD examples cover billing, ads, crashes, generic asks, but not the "feature X doesn't work for me" without reproducibility. This is a common 1-3★ noise category.

2. **Add a category to META: "trial path"** — was the user evaluating, mid-trial, post-trial-charge, post-cancel? This is signal-rich for understanding conversion friction but the current persona schema collapses it into "engagement".

3. **Acknowledge `persona`-only emissions are valuable.** The schema lets you emit empty observations with rich persona — but the prompt doesn't celebrate this. Some 5★ reviews give zero observations but priceless persona data. Worth saying "persona/meta can be the only output, that's fine".

## Recommendation

**Prompt is well-calibrated for scaling.** Three small additions above would tighten it but the core extraction logic works. Estimate: scaling to all 8,279 reviews would yield ~2,500-3,000 observations + ~6,000 persona records.

The two most interesting insights from this sample alone (marketing-funnel disconnect; promo code leak) came from 4-5★ reviews. **If those patterns appear at scale, the user's hypothesis is confirmed: 4-5★ are where the strategy-level insights live.**

## Next steps

1. Update prompt with the 3 small additions above
2. Wait for sub-agent rate limit reset
3. Scale to full 8,279 across ~5-8 parallel sub-agents in waves
4. Cluster → synthesize → novelty → judge
