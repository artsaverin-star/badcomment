import type { Locale } from "@/site/i18n/locales";
import type { LandingData } from "./data";
import { LaunchLanding } from "./LaunchLanding";
import "./landing.css";

export function LandingPage({ locale, data }: { locale: Locale; data: LandingData }) {
  return <LaunchLanding locale={locale} data={data} />;
}
