import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldHref } from "@/lib/oldHref";

// v2 was the experiment; its design is now the canonical category page.
export const dynamic = "force-dynamic";

export default async function SegmentV2Redirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(oldHref(await getLocale(), `/segment/${slug}`));
}
