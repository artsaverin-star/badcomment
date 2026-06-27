import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import SavedIdeas from "@/components/SavedIdeas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Избранное — inApp",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-14">
      <h1 className="text-center text-[clamp(26px,7vw,40px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)]">{ru ? "Избранное" : "Saved"}</h1>
      <p className="mx-auto mt-3 max-w-[40ch] text-center text-[15px] text-[var(--color-text-secondary)]">{ru ? "Идеи, которые ты отметил ♥ в ленте." : "The ideas you hearted in the feed."}</p>
      <div className="mt-8">
        <SavedIdeas locale={locale} />
      </div>
    </main>
  );
}
