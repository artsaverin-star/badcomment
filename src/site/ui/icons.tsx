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

const STAR = "31.5,14.5 36.6,26.5 49.6,27.6 39.7,36.2 42.7,48.9 31.5,42.1 20.3,48.9 23.3,36.2 13.4,27.6 26.4,26.5";

/**
 * The app icon (Assets.xcassets/AppIcon: a yellow paper star on cobalt) drawn as vector,
 * so the shell needs no raster asset. Square; round it with the container (22 % radius).
 */
export function AppMark({ size = 28, title, ...props }: GlyphProps & { title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      <rect width="64" height="64" fill="#1C4DDB" />
      <g strokeLinejoin="round" strokeWidth="3.2">
        <polygon points={STAR} fill="#E8431F" stroke="#E8431F" transform="translate(2.4 2.6)" />
        <polygon points={STAR} fill="#F7931E" stroke="#F7931E" transform="translate(1.2 1.3)" />
        <polygon points={STAR} fill="#FCD424" stroke="#FCD424" />
      </g>
    </svg>
  );
}
