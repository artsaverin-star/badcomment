// The app scrolls a rating list back to its top whenever the query changes
// (`.onChange(of: query) { proxy.scrollTo(…top) }`, ClarityRatings.swift:106, 227), so the
// results start right under the field. The web does the same for the search field — only when
// it has scrolled away above the sticky bars (html scroll-padding-top covers the top bar and
// the detail toolbar), never while it is in view. Client-only helper.

export function revealSearchField(input: HTMLElement | null): void {
  const box = input?.closest<HTMLElement>(".ia-search") ?? input;
  if (!box) return;
  const bars = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (box.getBoundingClientRect().top < bars) box.scrollIntoView({ block: "start" });
}
