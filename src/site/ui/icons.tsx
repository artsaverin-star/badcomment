// The new site's icon set: lucide-react (ISC), named by role so a later swap is one file.
// SF Symbols cannot ship on the web (spec 05 §3.6 Q). Icons are decorative by default
// (aria-hidden); give the control an accessible name instead.

import type { SVGProps } from "react";

export {
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ExternalIcon,
  BookOpen as ResearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkCheck as BookmarkFilledIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Circle as RadioOffIcon,
  CircleAlert as AlertIcon,
  CircleCheck as RadioOnIcon,
  CircleX as ClearIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  Ellipsis as MoreIcon,
  FileText as DocumentIcon,
  Globe as GlobeIcon,
  Lightbulb as IdeasIcon,
  List as TocIcon,
  ListFilter as FilterIcon,
  Lock as LockIcon,
  LogIn as SignInIcon,
  LogOut as SignOutIcon,
  Mail as MailIcon,
  Quote as QuoteIcon,
  RefreshCw as RetryIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Smartphone as PhoneIcon,
  Sparkles as SparklesIcon,
  SquarePen as NoteIcon,
  Star as StarIcon,
  UserRound as AccountIcon,
  X as CloseIcon,
} from "lucide-react";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number | string };

/** Filled lock (SF `lock.fill`) — lucide has no filled variant. */
export function LockFilledIcon({ size = 17, ...props }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="4" y="10.5" width="16" height="11.5" rx="3" fill="currentColor" />
    </svg>
  );
}


/**
 * The app icon (Assets.xcassets/AppIcon: a yellow paper star on cobalt) drawn as vector,
 * so the shell needs no raster asset. Square; round it with the container (22 % radius).
 */
/**
 * The inApp logo = the iOS app icon (paper star on cobalt), pre-rendered with the iOS corner
 * radius into public/brand/app-icon-{64,128,256}.{webp,png} from the app's AppIcon asset.
 */
export function AppMark({ size = 28, title, className }: { size?: number; title?: string; className?: string }) {
  const base = size <= 32 ? 64 : size <= 64 ? 128 : 256;
  return (
    <picture className={className} style={{ display: "inline-flex", width: size, height: size, flex: "none" }}>
      <source type="image/webp" srcSet={`/brand/app-icon-${base}.webp 1x, /brand/app-icon-${Math.min(base * 2, 256)}.webp 2x`} />
      <img
        src={`/brand/app-icon-${base}.png`}
        width={size}
        height={size}
        alt={title ?? ""}
        aria-hidden={title ? undefined : true}
        decoding="async"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.2237), display: "block" }}
      />
    </picture>
  );
}
