import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// «Разборы» снова живут на корне; этот старый адрес секции ведёт туда.
// Редирект намеренно временный (307, не 308): главная у сайта исторически
// кочует, а закэшированный браузером permanent потом не отозвать.
export default async function CategoriesRedirect() {
  const locale = await getLocale();
  redirect(locale !== "en" ? "/ru" : "/en");
}
