# Design parity (by code): paywall, sign-in, welcome replay, landing

Reviewer key: `design-parity-plus-auth-welcome-landing` · 2026-09-23 · read-only review, no files edited.

## Scope and state of the code

- **Paywall:** `src/site/features/plus/{PlusOffer,PaywallHost,plus.css,server,strings}` + `src/app/(site)/site/[lang]/plus/page.tsx`. Compared with `Inapp/Clarity/ClarityPaywall.swift`, `ClarityWelcomeComponents.swift` and `ClarityWelcomeTypography.swift`.
- **Sign-in:** `src/site/features/auth/**` + `login/page.tsx`. The app has no equivalent screen, so I checked it against the welcome/paywall visual language.
- **Welcome replay:** `src/site/features/welcome/{WelcomeFlow.tsx,welcome.css,keys.ts}` + `welcome/page.tsx`. **This work was still in progress during the review.** At 00:00 only `welcome.css` existed and the page was the TODO placeholder. `WelcomeFlow.tsx` and the real page then landed at 00:02–00:03, and this report covers that version. Compared with `ClarityOnboarding.swift` and `ClarityWelcome{Illustration,ContentPreview,Carousel,Components,Typography}.swift`.
- **Landing:** `src/site/features/landing/**` (incl. `landing.css`, which appeared at 00:00) + `[lang]/page.tsx`. Compared with spec 08, spec 05 §1.5 and the app components it reuses.
- Swift paths below are relative to `/Users/artsaverin/projects/app_04_inapp/Inapp/Clarity/` unless stated otherwise.
- Dev server check: `/ru`, `/ru/plus`, `/ru/login` and `/ru/welcome` return 200. One transient 500 was caused by another agent's `src/site/i18n/server.ts` edit (`CONTENT_ROOT` defined twice). It is not a finding.
- **Blockers: none.** Majors (8): P1, P2, W1, W2, W3, L1, L2, L3. Minors: the rest.

---

## A. Plus paywall (`/plus` + sheet)

### P1 · major · Paywall body text is system sans; in the app every paywall string is Onest
- **Web:** `plus.css:3-12` (`.ia-plus` sets no font, so it inherits `--ia-font-sans` from `site.css:102`). The rules below restate sans explicitly:
  - `.ia-plus__secondary`, `plus.css:234`
  - `.ia-plus__legal a/button`, `plus.css:268`
  - `.ia-plus__plan-*`, `plus.css:152-167`
  - `.ia-plus__disclosure`, `.ia-plus__error`, `.ia-plus__unlocked`, `plus.css:171-207`
  - `.ia-plus__lead` weight 400, `plus.css:106`
- **App:** every text uses `clarityWelcomeText(...)`, and `ClarityWelcomeTypography.font` = Onest (`ClarityWelcomeTypography.swift:23-33,61-75`):
  - plan title / detail / price 16/650 · 12/400 · 15/600 (`ClarityPaywall.swift:113-118`)
  - close 15/500 (`:139`)
  - status lines 15/600 and 13 (`:193,197,203,208`)
  - disclosure 15/600 + 12 (`:228,231`)
  - legal row 12/550 (`:299`)
  - secondary 13/500 (`ClarityWelcomeComponents.swift:65`)
  - description weight **450** (`ClarityWelcomeTypography.swift:54`)
- **Fix (`plus.css`):**
  ```css
  .ia-plus { font-family: var(--ia-font-display); }
  .ia-plus__lead { font-weight: 450; }
  .ia-plus__secondary { font: 500 0.8125rem/1.385 var(--ia-font-display); }
  .ia-plus__legal a, .ia-plus__legal button { font: 550 0.75rem/1.333 var(--ia-font-display); }
  .ia-plus__plan-title { font: 650 1rem/1.3 var(--ia-font-display); }
  .ia-checkout__text { font: 450 1.125rem/1.44 var(--ia-font-display); } /* same voice on the return page */
  ```

### P2 · major · The primary CTA is not pinned; on a phone the sheet opens with «Купить навсегда» below the fold
- **Web:** `PlusOffer.tsx:215-280`. The footer (disclosure → CTA → secondary) sits inline in the scrolling `.ia-sheet__body`. PaywallHost does not use `Sheet`'s `footer` slot (`PaywallHost.tsx:111-125`; the slot exists in `Sheet.tsx:41-42,199`).
- **Estimate** (390 px wide, 664 px visible, iOS Safari, guest):
  - grab + header: 69
  - art: 210
  - title + description: ~110
  - benefit list: ~140
  - plan row: 70
  - gaps: 64
  - Total ≈ 716 px before the CTA starts. The sheet itself is ≤ 652 px.
- **App:** the footer lives outside the `ScrollView` and is always visible (`ClarityPaywall.swift:35-66`). The legal block is inside the scroll content, before the footer (`:51-55`).
- **Fix:** split `PlusOffer` into `body` and `footer`. Pass the footer through `<Sheet footer={…}>`, and on the page variant use `position: sticky; bottom: 0; background: var(--ia-paper); padding: 10px 24px 8px`. The order then becomes: content (plan → status → pay note → legal → iPhone note) + pinned footer (disclosure, CTA, «Остаться с бесплатным разбором»). This matches `ClarityWelcomeFooter` (`ClarityWelcomeComponents.swift:44-83`). Remove the border-top that `.ia-sheet__footer` adds (`site.css:868-873`): the app footer has no rule.

### P3 · minor · Web-only benefit checklist, and the plan is named «Plus навсегда»
- **Web:** `PlusOffer.tsx:186-193` renders four check-marked lines; `strings.ts:11` sets `planTitle: "Plus навсегда"`.
- **App:** there is no list. The description `Все разборы и идеи, новые выпуски и экспорт материалов.` already says the same (`ClarityPaywall.swift:47`). The lifetime row title is `L("Навсегда")` (`:102`).
- **Fix:** delete the `<ul className="ia-plus__benefits">` block (it also shortens the sheet, see P2). Use `t("Навсегда")` for the row title; the key is present in all packs and the landing already uses it at `LandingPage.tsx:514`.

### P4 · minor · The sheet's «Закрыть» is a 17/600 ink glass pill; the app uses a plain 15/500 secondary text button
- **Web:** `PaywallHost.tsx:116-120` → `SheetAction` (`Sheet.tsx:207-222`, `.ia-glass-pill`).
- **App:** `ClarityPaywall.swift:138-141`: `clarityWelcomeText(size: 15, weight: 500)`, `.foregroundStyle(secondary)`, min height 44.
- **Fix:** pass a plain trailing button: `<button id="paywall-close" className="ia-plus__close">`. Style it with `.ia-plus__close { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--ia-secondary); font: 500 0.9375rem/1.2 var(--ia-font-display); }`.

### P5 · minor · Colours of the secondary link and «Войти, чтобы восстановить доступ»
- **Web:** `.ia-plus__secondary { color: var(--ia-secondary) }` (`plus.css:233`) and `.ia-plus__legal button { color: var(--ia-accent) }` (`plus.css:279-281`).
- **App:**
  - The footer secondary is a `.plain` button without its own style. It inherits `.foregroundStyle(ink)` / `.tint(ink)` from the paywall root (`ClarityWelcomeComponents.swift:64-69`, `ClarityPaywall.swift:67-69`), so it is **ink**.
  - The legal row buttons are plain as well, so they are also ink (`:286-299`).
- **Fix:** `.ia-plus__secondary { color: var(--ia-ink) }` and delete the `.ia-plus__legal button` accent rule.

### P6 · minor · The privacy link is missing from the legal row
- **Web:** `PlusOffer.tsx:284-293` renders Restore · Оферта · Условия использования · Поддержка. `"Конфиденциальность"` is in `PLUS_UI_KEYS` (`server.ts:23`) but never rendered.
- **App:** Восстановить · Условия · **Приватность** (`ClarityPaywall.swift:287-297`).
- **Fix:** add `<Link href={routes.privacy(locale)}>{t("Конфиденциальность")}</Link>` after «Условия использования».

### P7 · minor · The radio glyph is a check mark, not a radio dot
- **Web:** `RadioOnIcon` = lucide `CircleCheck` (`ui/icons.tsx:19`), used at `PlusOffer.tsx:195`.
- **App:** SF `largecircle.fill.circle`, 21 pt: a ring with a filled centre (`ClarityPaywall.swift:110-111`).
- **Fix** (`icons.tsx`):
  ```tsx
  export function RadioOnIcon({ size = 21, ...p }: GlyphProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="5.5" fill="currentColor" />
      </svg>
    );
  }
  ```

### P8 · minor · Spacing inside the offer
The web gaps are all 16 or 12. The app values:
- plan / status / legal group spacing is **12** (`ClarityPaywall.swift:51`); web places the plan and the error at the 16 gap (`plus.css:7`)
- footer spacing is **10** (`ClarityWelcomeComponents.swift:57`); web uses 12 (`plus.css:190`) plus `margin-top: 4px`
- disclosure line gap is **3** (`ClarityPaywall.swift:226`); web uses 2 (`plus.css:197`)
- plan title ↔ detail gap is **3** (`:112`); web uses 2 (`plus.css:149`)

**Fix:** wrap the plan, status lines and legal row in a `display:flex; flex-direction:column; gap:12px` group, and set the footer gap to 10px, disclosure 3px and plan text 3px.

### P9 · minor · Artwork choreography is simplified
- **Web** (`plus.css:24-80`):
  - every layer pops in place (`rotateX(18deg) scale(.6)`) and ends at its final rotation
  - one float runs for all three layers: 12 s, one-directional (+3°, −6 px)
- **App** (`ClarityPaywall.swift:159-184`):
  - **left** starts at (42 %, 55 %), rotation +6°, `rotateY(-18°)`, scale .60, then flies out to (20 %, 37 %) at −12°
  - **right** starts at (58 %, 56 %), −6°, `rotateY(18°)`, then flies to (81 %, 40 %) at +9°
  - **centre** rises from y 70 % to 52 % with `rotateX(10°)`, scale .62 anchored at the bottom
  - ambient motion: sides `sin(2t)` means a **6 s** period with ±3° and ±6/7 px; centre 12 s with ±1.5°, −5 px and scale ±1.8 %
- **Fix:** give each layer its own keyframes, for example the left one:
  ```css
  @keyframes ia-plus-pop-left {
    from { opacity: 0; left: 42%; top: 55%; transform: perspective(600px) rotate(6deg) rotateY(-18deg) scale(.6); }
    to   { opacity: 1; left: 20%; top: 37%; transform: perspective(600px) rotate(-12deg) rotateY(0) scale(1); }
  }
  ```
  - Give the centre layer `transform-origin: 50% 100%`.
  - Floats: `ia-plus-float-side { 0%,100% { transform: rotate(var(--r)) translateY(0) } 25% { rotate: 3deg; translate: 0 -6px } 75% { rotate: -3deg; translate: 0 6px } }`, 6 s linear infinite. The centre uses the same shape over 12 s with ±1.5° and −5 px.
  - Keep the function lists identical in `from`/`to`: the current `from` has `perspective()`/`rotateX()` and `to` does not, so the browser falls back to matrix interpolation.

### P10 · minor · Title and description grow with the viewport inside a 440 px column
- **Web:** `.ia-plus__title` / `.ia-plus__lead` use `--ia-fs-display: clamp(2.375rem, 1.9rem + 2vw, 3rem)` and `--ia-fs-display-copy` (`tokens.css:148,151`). That gives 48 px / ≈22 px on desktop. The welcome replay uses the same tokens (`welcome.css:135,161`).
- **App:** 38 / 18. The caps of 48 / 26 apply only with Dynamic Type (`ClarityWelcomeTypography.swift:8-11,37,50`).
- **Fix:** in `plus.css` and `welcome.css` use `font-size: 2.375rem` and `1.125rem`. The rem units already follow the browser text size, which is the Dynamic Type equivalent. Keep the clamp tokens for the landing.

---

## B. Welcome replay (`/welcome`)

### W1 · major · Page 5 is not the paywall; it is a teaser that opens the paywall sheet on top
- **Web:** `WelcomeFlow.tsx:252-256,352-358,423-431` renders art + «Полный доступ» + description, then the CTA **«Открыть Plus»** calls `openPaywall()`. The sheet then shows the same art and title again, over a full-screen flow.
- **App:** step 4 *is* `ClarityPaywallView(onFinish:onBack:)` inline, under the same nav bar with back and dot 5/5 (`ClarityOnboarding.swift:29-33`; `ClarityPaywall.swift:132-149`). It has the plan row, status, legal row, disclosure, and a CTA that buys.
- **Fix:**
  - For `step === 4`, render `<PlusOffer variant="page" source="welcome" onClose={close} />` in `.ia-wel-stage`, and render its footer through the welcome footer (after P2's split).
  - Merge `PLUS_UI_KEYS` into `WELCOME_UI_KEYS`, and pass `plusOfferData(lang, t)` from `welcome/page.tsx`.
  - When `viewer.plus`, keep «Открыть библиотеку» + «Закрыть» (already correct).

### W2 · major · «Дальше» is stretched to full width
- **Web:** `welcome.css:564-567` sets `.ia-wel-footer .ia-btn--welcome { width: 100%; max-width: var(--ia-w-welcome); }`.
- **App:** `ClarityWelcomeButton` hugs its label, 27×17 padding and centred (`ClarityWelcomeComponents.swift:23-38`, no `maxWidth: .infinity`).
- **Fix:** delete the rule. Also match the chevron to SF `chevron.right` 13 semibold: `ChevronRightIcon size={13} strokeWidth={2.4}` (`WelcomeFlow.tsx:407`).

### W3 · major · The footer is not pinned; on short phones «Дальше» scrolls out of view
- **Web:** `.ia-wel { min-height: 100dvh }` + `.ia-wel-stage { flex: 1 }` (`welcome.css:5-15,86-96`). The whole document grows and scrolls.
- **Example:** on a 375×548 visible viewport (iPhone SE with Safari bars), page 2 needs about 745 px, so the CTA ends up below the fold.
- **App:** nav, then a `ScrollView` with the content centred (`minHeight` = the available height), then the footer outside the scroll view (`ClarityOnboarding.swift:49-104`).
- **Fix:**
  ```css
  .ia-wel { height: 100dvh; min-height: 0; }
  .ia-wel-stage { flex: 1 1 auto; min-height: 0; overflow-y: auto; justify-content: safe center; scrollbar-width: none; }
  .ia-wel-nav, .ia-wel-footer { flex: none; }
  ```

### W4 · minor · Nav and footer text is not Onest; the secondary colour is wrong
- **Web:**
  - `.ia-wel-close` is `500 0.9375rem var(--ia-font-sans)` (`welcome.css:73`)
  - `.ia-wel-secondary` is `500 13px var(--ia-font-sans)` in the secondary colour (`welcome.css:576-577`)
  - `.ia-wel-nav` has `min-height: 52px` (`:28`)
- **App:**
  - «Закрыть» / «Пропустить»: Onest 15/500 secondary (`ClarityOnboarding.swift:123-129`)
  - footer secondary: Onest 13/500, ink when visible (`ClarityWelcomeComponents.swift:64-69`)
  - nav height = 4 + 44 = 48
- **Fix:** switch the font to `var(--ia-font-display)` in both rules, set `.ia-wel-secondary { color: var(--ia-ink) }` (the reserved row stays `visibility: hidden`), and set `min-height: 48px`.

### W5 · minor · Copy reveal timing and visual reveal duration
- **Web:**
  - the title scales from .72/.90 with a 700 ms spring curve from 60 ms and **no fade** (`welcome.css:141-155`)
  - the visual runs 900 ms (`:175`)
- **App:**
  - The copy `VStack` has `.animation(.easeOut(duration: 0.45).delay(0.14), value: revealed)` (`ClarityOnboarding.swift:83-87`). That overrides the spring for the whole block, so the title's scale, the fade and y +12 all run 450 ms ease-out, starting 60 + 140 ms after the page appears.
  - The visual uses the spring (0.72/0.58) = `--ia-dur-reveal` 1130 ms (`:65-67,112`).
- **Fix:**
  ```css
  .ia-wel-copy { animation: ia-wel-rise var(--ia-dur-text-reveal) ease-out 200ms both; }
  .ia-wel-title { animation: ia-wel-title var(--ia-dur-text-reveal) ease-out 200ms both; } /* keyframes: scale .9 / .72 only */
  .ia-wel-desc { animation: none; }
  .ia-wel-visual { animation-duration: var(--ia-dur-reveal); }
  ```

### W6 · minor · The step change has no exit animation
- **Web:** `key={step}` remounts the step, so the old page vanishes at once. Only an entrance runs (`WelcomeFlow.tsx:391`, `welcome.css:103-120`).
- **App:** an asymmetric transition: the new page enters from x +50·dir with a fade, and the old page leaves to x −35·dir with a fade, spring 0.55/0.9 (`ClarityOnboarding.swift:96-99,141`).
- **Fix:** render the previous step for `--ia-dur-step` with `.ia-wel-step--out { position: absolute; inset: 0; animation: ia-wel-out var(--ia-dur-step) var(--ia-ease-step) forwards }` and `@keyframes ia-wel-out { to { opacity: 0; transform: translateX(calc(-35px * var(--dir))) } }`. Alternatively use `document.startViewTransition`.

### W7 · minor · Carousel wrap-around and timer (the landing carousel has the same issue)
- **Web:**
  - autoplay jumps `% count`, so after the last slide it smooth-scrolls back across every slide (`WelcomeFlow.tsx:99-103`; landing `Carousel.tsx:58-77`)
  - each intermediate slide briefly gets `data-active` and restarts its paper entrance
  - `setInterval` is not re-armed after a manual swipe
- **App:**
  - slide 1 is duplicated at the end; the pager advances forward onto the copy, then snaps to index 0 with animations disabled (`ClarityWelcomeCarousel.swift:31-38,69-74`)
  - the timer is keyed to the page, so every manual move starts a full new interval (`:17,59-66`)
- **Fix:**
  - Append a clone of slide 0 (`aria-hidden`, `inert`).
  - On `scrollend` at the clone, set `el.scrollLeft = 0` with `behavior: "auto"`.
  - Replace `setInterval` with a `setTimeout` re-armed whenever `index` changes.

### W8 · minor · Idea papers reuse the article entrance
- **Web:** `.ia-wel-idea` uses `ia-wel-paper-a` / `-q`, which enter from above at −14°/+17°, over 1100 ms on the reveal curve (`welcome.css:507-513,435-446`).
- **App** (`ClarityWelcomeContentPreview.swift:158-176,195-203,226`):
  - first idea: from (−24, **+66**) at **−17°**; second idea: from (+28, **+94**) at **+18°**
  - 3D tilt on the **Y** axis, bottom anchor
  - paper spring 0.88/0.59 ≈ `--ia-dur-paper` 1380 ms
  - shadow while entering: `0 19px 42px rgb(0 0 0 / .14)`
- **Fix:** add dedicated keyframes. The `rotate` property already holds ∓3°, so the transform only adds the difference:
  ```css
  @keyframes ia-wel-idea-a {
    from { opacity: 0; transform: translate(-24px, 66px) rotate(-14deg) scale(.84);
           box-shadow: 0 19px 42px rgb(0 0 0 / .14); }
  }
  @keyframes ia-wel-idea-b {
    from { opacity: 0; transform: translate(28px, 94px) rotate(15deg) scale(.84); }
  }
  ```
  Run them with `var(--ia-dur-paper)` and `transform-origin: 50% 100%`.

### W9 · minor · Paper and illustration geometry
| Web | App |
|---|---|
| `.ia-wel-ideas` padding-inline 10 / `--single` 40 (`welcome.css:454,459`) | 20 on every page (`ClarityWelcomeContentPreview.swift:146`) |
| `.ia-wel-idea img` has no radius (`:475-481`) | art is clipped by `artworkShape`, radius 20 on all corners (`ClarityIdeaCardArt.swift:53`) → `border-radius: 20px` |
| idea body gap 6 (`:485`) | 9 (`:124`) |
| paper gap 10, label margin 4 + letter-spacing .02em, top row `align-items: flex-start` (`:346,362-367,359`) | spacing 12 / 7, no tracking, `alignment: .center` (`:53-55`) |
| quote gap 8 (`:396`) | 7 (`:87`) |
| mini-card padding 4 % (≈14 px), stars 7 px (`:259`, `WelcomeFlow.tsx:149`) | padding 10, stars 6 pt (`ClarityWelcomeIllustration.swift:163,168`) |
| 6-line clamp on idea text < 400 px (`:499-506`) | never clamped (`fixedSize`) → remove |

### W10 · minor · Illustration motion is a single group float
- **Web:**
  - `.ia-wel-float` moves the whole art-plus-cards group ±5 px / 0.6° (`welcome.css:236-247`)
  - the blob has no entrance
  - the art, card and chip entrances lack rotation and the bottom origin (`:230-235,281-286`)
- **App** (`ClarityWelcomeIllustration.swift:40-131`):
  - blob: scale .7 → 1 with a fade, then breathes 2.2 % and sways ±2°
  - art: from −10°/+11°, 3D −24°, anchored at the bottom; then rises −6 px and sways ±1.8° / −2.2°
  - review cards: from angle −30°, 3D −68°; then lift −9 px, flutter ±4° plus 3D ±8° with per-card seeds
  - chips: from ±27°; orbit ±3.5°
- **Fix:** animate the layers separately. Use per-element CSS custom properties for the seeds (`animation-delay: calc(var(--seed) * -1s)` on a 12 s `ease-in-out alternate` loop), and set `transform-origin: 50% 100%` on the art.

---

## C. Sign-in (`/login` + dialog)

The app has no sign-in screen, so parity here means using the welcome/paywall visual language.

### A1 · minor · Mixed voices
- **Web:** the title is Onest 900 (`auth.css:40-48`), but the lead and the method buttons are system sans (`auth.css:50-57,113-124`).
- **App:** Onest 900 titles are paired with the Onest 18/450 description and the Onest 17/600 capsule (`ClarityWelcomeTypography.swift:49-58`; `ClarityWelcomeComponents.swift:27`).
- **Fix:**
  ```css
  .ia-auth__lead { font: 450 1rem/1.44 var(--ia-font-display); }
  .ia-auth__method { font-family: var(--ia-font-display); letter-spacing: 0; }
  ```

### A2 · minor · A second blue next to cobalt
- **Web:** the Telegram button fill and badge are `#2AABEE` (`auth.css:4,32-34,141-144`).
- **Spec:** 05 §6.2 says "Cobalt is the only brand color in the product UI".
- **Fix (owner call):** either make Telegram the primary action on `var(--ia-action)` with a white Telegram glyph, or keep the brand colour as a documented exception.

### A3 · minor · Presentation and close control
- **Web:** `variant="dialog"` is a centred 420 px card on phones as well (`SignInHost.tsx:99-109`; `site.css:785-797`). Its close control is a 17/600 glass pill.
- **App:** sheets are bottom sheets on phones (spec 05 §3.6 N), and the welcome-family close is 15/500 secondary text (`ClarityPaywall.swift:138-141`).
- **Fix:** use the default `variant="sheet"` with `size="paywall"`. Use the same plain `«Закрыть»` button as P4.

### A4 · minor · Card and legal link details
- **Web:**
  - the `/login` card at ≥ 760 px has no hairline (`auth.css:255-261`), so in dark mode it is separated only by an invisible black shadow
  - the legal links are underlined 12 px secondary (`auth.css:228-237`)
- **Fix:**
  - `box-shadow: var(--ia-shadow-research-card), inset 0 0 0 .5px var(--ia-line-card)` (spec 05 §4.5)
  - legal links as in the app paywall: `font: 550 .75rem/1.333 var(--ia-font-display); color: var(--ia-ink); text-decoration: none` (`ClarityPaywall.swift:299`)
  - press feedback `.ia-auth__method:active` should use the welcome values (`scale(.98)`, `opacity .9`, 140 ms ease-out) instead of `.97/.9` (`auth.css:132-135`)

---

## D. Landing (`/<L>` signed out)

### L1 · major · The App Store poster palette is barely used; the device frames do not follow the posters
- **Web:**
  - only `--ld-poster-cobalt` exists (`landing.css:9`), used by S12. The darkened second stop `#2F5AF3` is allowed by spec 05 §1.5.
  - The four pastel poster gradients, `--ia-poster-ink` and the white poster frame are not used.
  - S6 phones sit on the plain page with a near-black bezel `#1b1c20`, radius 44, tilt ±2° (`landing.css:766-782`, `LandingPage.tsx:317`). In dark mode the bezel almost disappears on `#111214`.
- **Source:** `Tools/render_storefront.swift:12,27,40-53,62-66`. Posters 02/04/05 are exactly S6 steps 1–3: the spec 08 S6 titles are poster captions 2, 4 and 5.
- **Fix:**
  - Define the tokens in `.ld`:
    ```css
    --ld-poster-ink: #171c2b;
    --ld-poster-yellow: linear-gradient(180deg, #f7c955, #fff1cc);
    --ld-poster-green: linear-gradient(180deg, #81d1ac, #e7f6e8);
    --ld-poster-lilac: linear-gradient(180deg, #c1abef, #f0eafb);
    --ld-poster-sky: linear-gradient(180deg, #8fb6ef, #ebf3fe);
    ```
  - Give each S6 visual a poster panel:
    ```css
    .ld-step__visual { padding: 36px 24px 0; border-radius: var(--ia-radius-research-card); overflow: hidden; position: relative; }
    .ld-step:nth-child(1) .ld-step__visual { background: var(--ld-poster-yellow) }
    .ld-step:nth-child(2) .ld-step__visual { background: var(--ld-poster-lilac) }
    .ld-step:nth-child(3) .ld-step__visual { background: var(--ld-poster-sky) }
    .ld-step:nth-child(4) .ld-step__visual { background: var(--ld-poster-green) }
    ```
  - Add two white discs at 22 % opacity (`::before`/`::after`), as in the posters.
  - Poster device frame: `.ld-phone { padding: 4px; border-radius: 20px; background: #fff; box-shadow: var(--ia-shadow-device) } .ld-phone__screen { border-radius: 16px }`, tilt −3°/+3° (`render_storefront.swift:40-53,75`).
  - Panels keep their fixed poster colours in dark mode, like artwork. Text stays outside the panels.

### L2 · major · S5 papers sit on a white band; in dark mode the article paper loses its edge
- **Web:** `.ld-section--tint { background: var(--ia-surface) }` (`landing.css:35-37`) is applied to S5 (`LandingPage.tsx:266`). The article paper is also `--ia-surface`, and its only edges are `rgb(0 0 0 / .05)` + `--ia-shadow-paper` (`landing.css:267-276`). Both are invisible on `#1D1E22`.
- **App:** papers always sit on paper (`ClarityOnboarding.swift:106`; `ClarityWelcomeContentPreview.swift:81-82`).
- **Fix:** remove `ld-section--tint` from S5; keeping it on S8 is fine. If the band stays, add `[data-theme="dark"] .ld-paper--article { box-shadow: var(--ia-shadow-paper), 0 0 0 .5px var(--ia-line-80) }`, plus the same under `@media (prefers-color-scheme: dark) [data-theme="system"]`.

### L3 · major · The hero/S5 "paper pair" is not the onboarding paper
- **Web** (`landing.css:263-338`; `parts.tsx:119-160`):
  - excerpt and quote are **Georgia** 15/1.5
  - quote header is **sans** 11/600
  - label 11/600, title 20 → 22 px
  - radius 8 / 6; article padding 18/18/24; quote padding 18/16/16
  - thumbnail 110×85 at r6; head gap 5; top row aligned to `flex-start`
- **App** (`ClarityWelcomeContentPreview.swift:53-110`), confirmed by spec 05 §2.2 (lines 184-186):
  - excerpt/quote Onest 14/400, line spacing 3 (≈ 1.49)
  - label Onest 10/550; rating 10/600; title 18/900 at 1.275
  - radius 6 / 5; padding 17 (+9 bottom) / 15
  - thumbnail 103×80 at r5; spacing 7; `alignment: .center`
  - Spec 08 S1 (line 213) says "Excerpt (Georgia)". That contradicts the code, and the code wins.
- **Fix:** reuse one component for both surfaces. Move `.ia-wel-paper*` / `.ia-wel-quote*` (after W9) into a shared `src/site/ui` paper component and render `PaperPair` with it. To enlarge the desktop hero, scale the whole pair (`.ld-papers--hero { scale: 1.15; transform-origin: 50% 100% }`) instead of changing individual font sizes (`landing.css:339-347`). Locale-specific quote marks stay (spec 09 G14).

### L4 · minor · Descriptions under Onest headings use the wrong voice
- **Web:** `.ld-lead` is sans (`landing.css:93-98`) and `.ld-sub` is Georgia (`:99-104`). The S4/S5 subs are verbatim onboarding descriptions (`LandingPage.tsx:215,271`).
- **App:** the Onest title pairs with the Onest 18/450 secondary description, line-height 1.44, max width 360 (`ClarityWelcomeTypography.swift:49-58`; `ClarityOnboarding.swift:76-81`).
- **Fix:** `.ld-lead, .ld-sub { font: 450 clamp(1.125rem, 1rem + .4vw, 1.375rem)/1.44 var(--ia-font-display); }`. Keep Georgia only for reading content (card titles, summaries, the S7 coming-next body).

### L5 · minor · Heading metrics
- **Web:**
  - `.ld-h1` is `line-height: 1.06; letter-spacing: -.025em` (`landing.css:47-53`). Over 2–4 lines of Cyrillic, Й/Ё accents collide at 1.06.
  - `.ld-h3` uses weight **800** (`:61-67`).
- **App:** display leading is natural − 4 pt, which gives 1.17 (−0.105 em) with −0.02 em tracking (`ClarityWelcomeTypography.swift:42-43`). The app uses Onest only at 900 for titles.
- **Fix:** `.ld-h1 { line-height: 1.12; letter-spacing: -.02em }` and `.ld-h3 { font-weight: 900 }`.

### L6 · minor · The «Бесплатный разбор» badge is accent-coloured
- **Web:** `<Badge tone="accent">` (`LandingPage.tsx:158,348`) adds `.ia-badge--accent`, which sets `color: var(--ia-accent)` (`site.css:497-499`).
- **App:** ink text, caption semibold, on `mint` (= accentSoft), padding 12×7 (`ClarityCatalogs.swift:134-139`, which inherits ink from `:152`).
- **Fix:** use `<Badge>` with the default tone.

### L7 · minor · The locked 6th idea shows text
- **Web:** `LandingPage.tsx:248-251` shows «Идея в Plus» + «Подробности идеи доступны в Plus.» under the art, in an aria-hidden body.
- **App:** a locked card is artwork + lock disc only. Those two strings are the a11y label and hint (`ClarityIdeaCard.swift:24-35,70-71`).
- **Fix:** drop `.ld-idea__body` from the locked tile and keep `aria-label={t("Идея в Plus")}` on the link. To keep the grid row height, either `aspect-ratio` the tile or let the art fill it with `height: 100%; object-fit: cover`.

### L8 · minor · Idea card metrics
- **Web:** `.ld-idea__desc` Georgia 17/1.45 (`landing.css:590-594`), body gap 12 (`:579`), category `padding-top: 4px` (`:597`), no 6 px bottom margin, hover `translate: 0 -2px` (`:552`).
- **App:** description = `--ia-type-subtitle` 19/26.6; gap 15; category +7; bottom margin 6 (`ClarityIdeaCard.swift:35-67`). Spec 05 §6.2 hover rule: −1 px + shadow +0.03.
- **Fix:**
  ```css
  .ld-idea__desc { font: 400 var(--ia-fs-subtitle)/var(--ia-lh-subtitle) var(--ia-font-serif); }
  .ld-idea__body { gap: 15px; }
  .ld-idea__cat { padding-top: 7px; }
  @media (hover: hover) { .ld-idea:hover { translate: 0 -1px; box-shadow: 0 6px 28px rgb(0 0 0 / .08); } }
  ```

### L9 · minor · Illustration composition differs from `ClarityWelcomeIllustration`
- **Web:**
  - the blob is always centred at 50 %/50 % (`parts.tsx:179`, `landing.css:372-380`)
  - the art is always 92 % wide at (4 %, −2 %) (`:381-388`)
  - `tilt={-18}` is used for `WelcomeResearch_v7` (`LandingPage.tsx:377`)
  - chips sit at 22/80/30 % with `--ia-shadow-paper` and the tape at −5 px (`:1233-1269`)
  - the WelcomeReviews hero art has no review cards and is hidden below 1024 px (`:214-229`)
- **App** (`ClarityWelcomeIllustration.swift:45-63,97-124,158-172`):
  - reviews: blob at (47 %, 47 %) −24°, art 96 % at (50 %, 46 %)
  - library: blob at (57 %, 47 %) +26°, art 86 % at (51 %, 49 %)
  - chips at 19/82/29 %, tag shadow `0 6px 16px rgb(0 0 0 / .075)`, tape at −4 px
  - there is no −18° variant
- **Fix:** render the landing illustrations with the welcome illustration markup (`.ia-wel-ill--reviews` / `--library`, including the mini review cards) instead of the separate `.ld-illo`. Add `--ia-shadow-tag` to `tokens.css` (spec 05 §3.4). S2 per spec 08 wants the small WelcomeReviews art too.

### L10 · minor · Motion: no "paper landing", and the drift is off
- **Web:**
  - only the hero papers drift: 6 s/7 s alternate, 0 → −5 px (`landing.css:348-363`)
  - S5 slides, the S7 chips and the S10 trio are static
- **Spec 08 §4** (lines 158-160) asks for "gentle float / 'paper landing' like the app".
- **App:** the paper entrance is described under W8. The resting drift is a 12 s sine with ±2 px y and ±0.45° rotation (`ClarityWelcomeContentPreview.swift:189-203`).
- **Fix:** add the entrances under `@media (prefers-reduced-motion: no-preference)`. Use `animation-timeline: view(); animation-range: entry 0% cover 30%` with a fallback that runs once on load. Change the drift to `ld-drift 12s ease-in-out infinite` with keyframes `50% { translate: 0 -2px; rotate: -3.45deg }` for the article; the quote gets the opposite sign. The papers already carry `rotate: ±3deg`, so the keyframes must include the base angle.

### L11 · minor · S5 carousel details
- **Web:**
  - wrap-around rewinds: see W7 (`Carousel.tsx:58-77`)
  - dots are 6 px with an 18 px active dot (`landing.css:692-709`)
  - the arrows are surface-coloured on the surface band (`:668-679`)
- **App:** progress capsules are 5×5 with an 18×5 active one, ink @16 % / ink (`ClarityWelcomeComponents.swift:106-110`).
- **Fix:** set the dot `::after` to `width: 5px; height: 5px; border-radius: 2.5px`. Fix the wrap as in W7. The arrow contrast is solved once the band goes (L2).

### L12 · minor · The S10 Plus block invents its own visual
- **Web:**
  - the Plus card has an accent ring `0 0 0 1.5px var(--ia-accent)` (`landing.css:1428-1432`) and a Sparkles icon (`LandingPage.tsx:495-497`)
  - plan rows are radius 14, surface fill, sans detail (`landing.css:1478-1495`)
  - trio side objects sit at `top: 28px/32px` (`:1395-1412`)
- **App** (no ring, no sparkles):
  - Settings Plus card: r24, stroke line @55 % 0.5; accent-soft band with «inApp PLUS» 12/700, tracking .8, accent, and `WelcomeLibrary_v7` 112 px high (`ClaritySettings.swift:199-251`)
  - paywall plan rows: r18, padding 14, `ink @15 %` 1 px border, title Onest 16/650, detail Onest 12 secondary (`ClarityPaywall.swift:107-125`)
  - trio side centres at y 37 % / 40 % of the box (`ClarityPaywall.swift:165,174`), which on the 160 px box means `top: -3px` / `2px`
- **Fix:**
  ```css
  .ld-plan--plus { box-shadow: inset 0 0 0 .5px var(--ia-line-card); }
  .ld-plan__options li { padding: 14px; border-radius: 18px; background: none; box-shadow: inset 0 0 0 1px var(--ia-ink-15); }
  .ld-plan__options b { font: 650 1rem/1.3 var(--ia-font-display); }
  .ld-plan__options span { font: 400 .75rem/1.333 var(--ia-font-display); }
  ```
  Remove `<SparklesIcon>` and correct the trio `top` values.

### L13 · minor · Uppercase labels are not in the app's language
- **Web:** `.ld-label` is uppercase 12/600 with +.06 em (`landing.css:86-92`); `.ld-m-caption` is uppercase (`:861-866`).
- **App:** the only all-caps text is the literal "inApp PLUS". Section labels are SF 15/600 secondary (`ClaritySettings.swift:289`).
- **Fix:** `.ld-label { text-transform: none; letter-spacing: 0; font: 600 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans); }`. The same applies to `.ld-m-caption`.

### L14 · minor · The step 1 mock uses an accent quote rule
- **Web:** `.ld-m-quote { border-left: 2px solid var(--ia-accent) }` (`landing.css:856-860`).
- **App:** the inline quote rule is 2 px in `line` colour (`ClarityReader.swift:447-457`; spec 05 §3.6 M).
- **Fix:** `border-left-color: var(--ia-line)`.

---

## E. Shared primitives used by these screens

### S1 · minor · The welcome capsule is 56 px tall, not 58
- **Web:** `.ia-btn--welcome` inherits `line-height: var(--ia-lh-headline)` (22 px) (`site.css:259-310`).
- **App:** the label frame has `minHeight: 24` + 17×2 padding = 58 (`ClarityWelcomeComponents.swift:34-35`).
- **Fix:** `.ia-btn--welcome { line-height: 24px; }` (spec 05 §6.1 uses `1.0625rem/1.4`).

### S2 · minor · Onest delivery
- **Web:** `src/site/fonts.ts:7-23` ships the full 193 KB **TTF** with `preload: false`. The landing H1 (the LCP element) and the paywall/welcome titles are Onest, so first paint falls back to system bold and then swaps with a layout shift. The `fallback` list ends in the generic `sans-serif`, which puts the Japanese stack of `--ia-font-sans` (Hiragino Sans / Noto Sans JP) after a generic family.
- **Spec:** 05 §2.1 says WOFF2, subset Latin + Latin-ext + Cyrillic.
- **Fix:** convert to `Onest.woff2` with unicode-range `U+0000-024F, U+0400-04FF, U+2000-206F, U+20AC, U+2116, U+2212`. Preload it on the landing, `/plus` and `/welcome` (`preload: true`, or a route-level `<link rel="preload" as="font" type="font/woff2" crossorigin>`). Remove `"sans-serif"` from `fallback` so `var(--ia-font-sans)` supplies the tail.
