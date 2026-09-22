# Saved, note editor, bookmark, Settings — parity review (from agent report)

Review of Saved, the note editor, the bookmark and Settings against the app code. I did not write `/Users/artsaverin/projects/badcomment-v2/docs/site-v2/review/<key>.md`, because my subagent rules forbid report files; the full findings are below instead.

**Summary:** Behaviour matches the app closely. That covers filters, the search quirks, ordering, loose-note versus all-notes visibility, fallbacks for unknown or locked items, auto-bookmark on note save, the discard guard, locale switching that keeps the place, and theme previews. Nothing blocks. There are 5 majors: the saved bookmark shows the wrong glyph and turns accent (app: ink); selected check-circles are outline, not filled; the «О материалах» page uses a big serif heading instead of a small title in the top bar; the empty-state button stretches full width; and Saved row spacing is off. The rest are spacing and copy details.

Status: everything in scope exists and renders at :3210. The Settings page and «О материалах» were placeholders at first; the settings agent wired them up during this review (files changed at 23:59–00:02), so re-check after they finish. Earlier the server returned 500 for a while (`CONTENT_ROOT` defined twice in `src/site/i18n/server.ts`, another agent's edit in progress); it was 200 again later.

Paths: web files are under `/Users/artsaverin/projects/badcomment-v2/`, Swift files under `/Users/artsaverin/projects/app_04_inapp/Inapp/`.

## Major

1. **Saved bookmark: wrong glyph and colour.** `src/site/ui/icons.tsx:12` maps `BookmarkCheck`, an outline bookmark with a tick. `src/site/styles/site.css:651` turns the pressed button accent-coloured. The app uses a filled `bookmark.fill`, and the reader toolbar is tinted ink (`Clarity/ClarityReader.swift:805,583,231`; spec 05 J).
   - Fix in `src/site/features/library/components.tsx:45`: `<BookmarkIcon size={17} fill="currentColor" />`.
   - Add `className="ia-lib-bookmark"` and `.ia-lib-bookmark[aria-pressed="true"]{color:inherit}`.
2. **`checkmark.circle.fill` renders as an outline** (`src/site/ui/icons.tsx:19`). It appears at `SettingsScreen.tsx:147`, `client.tsx:239` and `client.tsx:72`. Source: `ClaritySettings.swift:112,178,208`.
   - Fix: `fill="currentColor" stroke="var(--ia-surface)"`, the same trick the search clear button uses (`SearchField.tsx`).
   - On the Plus band use `stroke="var(--ia-accent-soft)"` at size 12, weight 500.
3. **«О материалах» page layout** (`settings/about/page.tsx:54-56`). The web shows a Georgia 30 heading in the body. The app shows only a small centred title in the navigation bar (`ClaritySettings.swift:306`).
   - Fix: `<DetailToolbar … title={t("О материалах")}/>` and remove `<Heading>`.
   - In `settings.css:407-430`: padding 24px on all sides (drop `padding-top:8px`), block gap 10px, body line-height 26px.
4. **Empty-state button stretches full width** (`SavedScreen.tsx:178`, `block`). In the app it hugs its content: padding 0 20px, min-height 50 (`ClarityMy.swift:121-124`).
   - Fix: remove `block` and set `padding:0 20px`.
   - Body margin-top 10px (`site.css:949`); add `.ia-lib .ia-empty{margin-top:16px}` (`:126`).
5. **Saved row spacing** (`ClarityMy.swift:151-164,295`):
   - `library.css:131`: text gap should be 6px, not 2px.
   - `:163-166`: the ⋯ button should be vertically centred (`align-self:center; padding:0 4px 0 0`), not top-aligned with a 9px offset.
   - `:95-97`: remove the 4px right padding (16px, as in the app).

## Minor

**Saved (`ClarityMy.swift`)**
- Section heading-to-box gap should be 12px, not 10 (`library.css:24`; `:220`).
- Large heading gap 8px, not 4 (`site.css:245`; `:88`). Title-to-gear gap 12px, not 16 (`Heading.tsx:37`; `:87`).
- Note-row chevron (`SavedScreen.tsx:353`; `:302`): size 13, stroke 2.5, top-aligned with margin-top 6px, no 0.7 opacity (`library.css:156-161`).
- No-results block (`library.css:190-210`; `:129-135`): gap 10px, padding 16px 0, body line-height 23px, text button padding 0.
- Error label should be left-aligned (`library.css:232`; `:74-76`).
- Search matching (`saved-model.ts:129`): the app requires all words to match within one field (`:242,231`). Fix: `[title,detail,note].some(f=>matchesQuery(q,[f],…))`.
- No right-click menu on rows (`SavedScreen.tsx:317`; `.contextMenu :158`).
- Unreadable browser storage shows no error (`store.ts:74-98`; spec 02 §9.2).
- Footer copy (`library/strings.ts:11`): should read «Сохранено в твоём аккаунте» (G11 #1). The guest line adds an extra sign-in call to action; the owner should confirm that.

**Note editor (`ClarityReader.swift:898-948`)**
- Body padding-top 20px, not 8 (`library.css:259`).
- Field line-height should be `var(--ia-lh-body)`, not the relaxed value (`:282`); the 9-line minimum then becomes 238px.
- Save-error text should be secondary colour, not danger (`:298`; `:918`).
- «Отмена» should be regular weight (`components.tsx:192`, `style={{fontWeight:400}}`).
- Don't auto-focus the text field on touch screens (`:151-158`).
- A failed save still changes what's shown on screen (`store.ts:123-124`); the app leaves its state unchanged.
- Remove the bookmark toast; spec 02 §5.4 says no feedback is needed (`components.tsx:42`).

**Settings (`ClaritySettings.swift`)**
- Plus card and the account box should be 12px apart, not 28 (`SettingsScreen.tsx:125-129`; `:200`).
- Row padding should be `17px 16px` (`settings.css:91`; `:326`).
- Row icons 19px, not 20 (`SettingsScreen.tsx:32`).
- Language rows medium weight, 500 (`settings.css:124`; `:110`).
- Header (`:183-196`):
  - The title bar doesn't stay pinned at the top.
  - Top padding should be 16px, not 8 (`settings.css:8`).
  - «Готово» shouldn't have a border line (`settings.css:39`).
  - The 34px desktop title isn't in the app (`settings.css:25-31`).
- Theme tile gap 10px, not 8 (`settings.css:288`).
- Plus card:
  - Band gap 4px, not 6 (`settings.css:206`).
  - «Активен» label weight 500, not 600 (`settings.css:224`).
  - Body text line-height 23px (`settings.css:245`).
  - Press effect should be scale 0.97 plus opacity 0.88 (`settings.css:200-202`).
- Restore row: the app keeps the icon and puts the spinner on the right (`client.tsx:173`). Result text should be indented 16px, not 56 (`settings.css:182`; `:267`).
- Guest row (`client.tsx:136-138`): G11 says «Войти, чтобы восстановить доступ».
- Footer:
  - Line 1 in the app is «inApp · 1.0», not the collection date (`SettingsScreen.tsx:178-181`).
  - Line gap 6px, not 4 (`settings.css:393`).
- Keep «г.» in the ru «Доступ до …» date (`client.tsx:31`; spec 02 §8.3).