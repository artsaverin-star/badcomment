// The new site's icon set: lucide-react (ISC), named by role so a later swap is one file.
// SF Symbols cannot ship on the web (spec 05 §3.6 Q). Icons are decorative by default
// (aria-hidden); give the control an accessible name instead.
// Where the app uses a *filled* SF Symbol (tab bar, saved bookmark, paid-idea lock) and lucide
// has only outlines, a small filled glyph is drawn here with the same 24-unit grid.

import { Bookmark, Lightbulb, type LucideProps } from "lucide-react";
import type { SVGProps } from "react";

export {
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ExternalIcon,
  // SF `text.book.closed` («Читать разбор категории», the Разборы tab): a closed book with text.
  BookText as ResearchIcon,
  // Settings rows: «О материалах», «Знакомство…», old site, privacy, payment offer.
  BookText as AboutIcon,
  Hand as PrivacyIcon,
  History as OldSiteIcon,
  ScrollText as PaymentOfferIcon,
  SquarePlay as WelcomeIcon,
  Bookmark as BookmarkIcon,
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
  // SF `text.alignleft`: the glyph of ClarityArt(role: .research) on the boot/error screens.
  TextAlignStart as TextLinesIcon,
  UserRound as AccountIcon,
  X as CloseIcon,
  // Web-only sections (no app glyph): «Рейтинги» = RatingIcon (below), «Отзывы», «MCP»; the
  // mobile menu.
  MessageSquareText as ReviewsIcon,
  Plug as McpIcon,
  Menu as MenuIcon,
  SquareTerminal as TerminalIcon,
  Unplug as DisconnectIcon,
  // Clarity rating / review archive / MCP rows (spec site-v2 §2.3 P8). In a Row tile draw them
  // at lucide 24 / stroke 1.9, which optically matches SF 21 medium (lucide fills ~80 % of its box).
  // SF `doc.text.magnifyingglass`: «Изучить весь разбор», «Откуда взят этот разбор» rows.
  FileSearch as SourceIcon,
  // SF `info.circle`: «… · об оценках» (the rating method sheet link).
  Info as InfoIcon,
  // One app (review archive app rows): no app glyph exists in Swift.
  AppWindow as AppWindowIcon,
  // Ratings (web-only rows and section): a ranked list, not a star (R4: ★ only as text).
  ListOrdered as RatingIcon,
  // Rating app page (spec 11 §4.3): «Что хвалят в отзывах» / «На что жалуются в отзывах» cards
  // and «Кому». The row and leader notes draw the same lucide shapes as CSS masks (rating.css).
  ThumbsUp as PraiseIcon,
  ThumbsDown as ComplaintIcon,
  UsersRound as AudienceIcon,
  // StudioStyle.categorySymbol (Studio/StudioStyle.swift:45-56), mapped in ./categoryGlyph.ts.
  Images as CategoryPhotoIcon, // photo.on.rectangle.angled
  Calendar as CategoryCalendarIcon, // calendar
  PersonStanding as CategoryFitnessIcon, // figure.run
  CreditCard as CategoryMoneyIcon, // creditcard
  NotebookText as CategoryNotesIcon, // note.text
  Headphones as CategoryMusicIcon, // headphones
  MoonStar as CategorySleepIcon, // moon.stars
  Carrot as CategoryFoodIcon, // carrot
  GraduationCap as CategoryLearnIcon, // graduationcap
  Layers as CategoryDefaultIcon, // square.stack.3d.up
} from "lucide-react";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number | string };

/** SF `bookmark.fill`: the saved state of the bookmark toggle and the Сохранённое tab. */
export function BookmarkFilledIcon(props: LucideProps) {
  return <Bookmark fill="currentColor" {...props} />;
}

/** SF `lightbulb.fill`: the Идеи tab. */
export function IdeasFilledIcon(props: LucideProps) {
  return <Lightbulb fill="currentColor" {...props} />;
}

/**
 * SF `text.book.closed.fill`: the Разборы tab — a filled closed book (spine on the left,
 * pages below the cover) with two text lines knocked out of the cover.
 */
export function ResearchFilledIcon({ size = 24, ...props }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M6.5 2H19a1 1 0 0 1 1 1v13.25a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 0-2.5 2.5V4.5A2.5 2.5 0 0 1 6.5 2Zm2.25 4.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Zm0 3.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z"
      />
      <path d="M6.5 18.5H19v3.5H6.5a1.75 1.75 0 0 1 0-3.5Z" />
    </svg>
  );
}

/**
 * SF `quote.opening` at caption size: a FILLED opening double quote (lucide has only an
 * outline closing-style mark). Used by the idea article's quotes and QuoteBlock.
 */
export function QuoteOpeningIcon(props: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M2.5 15.5C2.5 11 5 7.2 9.1 5.5l.8 1.7C7.6 8.4 6.4 10 6.1 12.1A3.7 3.7 0 1 1 2.5 15.5Z" />
      <path d="M13 15.5c0-4.5 2.5-8.3 6.6-10l.8 1.7c-2.3 1.2-3.5 2.8-3.8 4.9A3.7 3.7 0 1 1 13 15.5Z" />
    </svg>
  );
}

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
