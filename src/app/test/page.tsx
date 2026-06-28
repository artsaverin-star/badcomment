import type { Metadata } from "next";
import NicheDossier from "@/components/NicheDossier";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Разбор ниши, астрология (прототип)",
  robots: { index: false, follow: false },
};

// Preview route for the dossier layout. The live page is /segment/astrology.
export default function TestPage() {
  return <NicheDossier slug="astrology" />;
}
