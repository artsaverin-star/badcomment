"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useLocale } from "@/site/i18n/client";
import { routes } from "@/site/routing";
import { SearchField } from "@/site/ui";

// Research catalog search (spec 01 §4; spec 09 G10): the haystack contains locked article
// text, so matching runs on the SERVER. Typing updates `?q=` (replace, debounced) and the
// page re-renders with the matching cards; `children` = the server-rendered results, dimmed
// while the next result set is on its way. Without JS the form submits `?q=` normally.

const DEBOUNCE_MS = 180;

export function CatalogSearch({
  query,
  placeholder,
  clearLabel,
  children,
}: {
  query: string;
  placeholder: string;
  clearLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(query);
  const [synced, setSynced] = useState(query);
  const [focused, setFocused] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // The URL changed without typing (Back/Forward, a link): show that query.
  if (query !== synced) {
    setSynced(query);
    if (!focused) setValue(query);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (q: string) => {
    window.clearTimeout(timer.current);
    startTransition(() => {
      router.replace(routes.research(locale, { q }), { scroll: false });
    });
  };

  return (
    <>
      <form
        action={routes.research(locale)}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <SearchField
          name="q"
          value={value}
          onValueChange={(v) => {
            setValue(v);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => go(v), v === "" ? 0 : DEBOUNCE_MS);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          clearLabel={clearLabel}
          id="clarity-research-search"
        />
      </form>
      <div className="ia-rs-results" aria-busy={pending || undefined}>
        {children}
      </div>
    </>
  );
}
