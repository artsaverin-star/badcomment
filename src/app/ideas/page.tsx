import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The idea deck is now the homepage. Keep /ideas as a permanent redirect so old
// links and bookmarks still land on it.
export default function IdeasRedirect() {
  redirect("/");
}
