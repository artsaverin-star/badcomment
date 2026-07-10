import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The category breakdowns gallery is now the homepage. Keep /categories as a
// permanent redirect so old links and bookmarks still land on it.
export default function CategoriesRedirect() {
  redirect("/");
}
