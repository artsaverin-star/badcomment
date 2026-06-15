"use client";

// template.tsx re-mounts on every navigation (unlike layout), so wrapping the
// page content here gives a soft fade-up transition between sections. Header /
// footer / bottom tab bar live in layout and stay put.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-fade">{children}</div>;
}
