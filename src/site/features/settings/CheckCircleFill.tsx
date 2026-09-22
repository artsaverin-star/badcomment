import { RadioOnIcon } from "@/site/ui/icons";

/**
 * SF `checkmark.circle.fill` (ClaritySettings.swift:112,178,208): a disc in the current color
 * with the tick knocked out in the colour of the box behind it (`knockout`). Server- and
 * client-safe (no hooks), used by the language rows, the theme tiles and the Plus band.
 */
export function CheckCircleFill({
  size = 18,
  knockout = "var(--ia-surface)",
  strokeWidth = 2.2,
}: {
  size?: number;
  knockout?: string;
  strokeWidth?: number;
}) {
  return <RadioOnIcon size={size} strokeWidth={strokeWidth} fill="currentColor" stroke={knockout} aria-hidden="true" />;
}
