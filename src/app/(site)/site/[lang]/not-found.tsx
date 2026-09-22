import { NotFoundView } from "@/site/shell/StatusViews";

// 404 of the new site (notFound() in any page, and every unknown path under /<L>/… that the
// proxy sends here — see [...missing]/page.tsx). Rendered inside the new root layout, so the
// chrome, locale and strings are the page's own. Next adds robots noindex to 404 responses.
export default function NotFound() {
  return <NotFoundView />;
}
