import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// «Создание» is the site's default section: the root opens the builder.
// The breakdowns gallery that used to live here is back at /categories.
export default async function Home() {
  const locale = await getLocale();
  redirect(`/${locale !== "en" ? "ru" : "en"}/build`);
}
