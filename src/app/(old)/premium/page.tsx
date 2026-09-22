import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Premium is retired in favour of the token model — keep the old URL working.
export default function PremiumPage() {
  redirect("/tokens");
}
