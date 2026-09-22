import { notFound } from "next/navigation";

// Any path under /<L>/ that the proxy hands to the new site but no page matches
// (e.g. /ru/settings/x, /ru/segment/<launch>/x, /ru/site/…): render the new site's 404
// inside its own layout instead of an unmatched-route 404 without chrome.
export default function Missing() {
  notFound();
}
