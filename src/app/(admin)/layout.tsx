import type { Metadata } from "next";
import "@saverin/tokens/css";
import "./admin.css";

// Root layout of the owner's admin (/<L>/admin, /<L>/admin/posts; the proxy rewrites them to
// /admin/… — src/site/routing/decide.ts SERVICE_TOP). It kept the retired old site's look when
// that site was removed (2026-09-27): the @saverin/tokens variables and the old text roles
// (admin.css), nothing else of the old chrome. Never indexed; the pages 404 for non-admins.

export const metadata: Metadata = {
  title: "inApp — admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="dark" data-brand="saverin" className="h-full antialiased">
      <body className="min-h-[100dvh] bg-[var(--color-bg-page)] text-[var(--color-text-primary)]">{children}</body>
    </html>
  );
}
