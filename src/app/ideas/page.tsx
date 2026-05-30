import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The idea deck is now the homepage; keep this path as a redirect so old
// links and bookmarks (and their filters) still land on the deck.
export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; type?: string }>;
}) {
  const { cat, type } = await searchParams;
  const sp = new URLSearchParams();
  if (cat) sp.set("cat", cat);
  if (type) sp.set("type", type);
  const q = sp.toString();
  redirect(q ? `/?${q}` : "/");
}
