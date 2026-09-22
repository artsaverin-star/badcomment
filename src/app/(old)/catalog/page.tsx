import { redirect } from "next/navigation";

// /catalog was retired — the site has three surfaces only: home, /ideas, /rating.
// Keep this stub so any old/external links land on the homepage instead of 404.
export const dynamic = "force-dynamic";

export default function CatalogPage() {
  redirect("/");
}
