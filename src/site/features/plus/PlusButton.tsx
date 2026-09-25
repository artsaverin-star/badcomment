"use client";

import { openPaywall } from "../../shell/actions";
import { Button, type ButtonVariant } from "../../ui/Button";
import { ArrowRightIcon } from "../../ui/icons";

// «Открыть Plus» for server-rendered pages outside the app's own gates (review archive, MCP):
// opens the global Plus sheet (PaywallHost) with an analytics `source`, like PaywallButton on
// the research gate. The label comes from the page (an app string or a web one).

export function PlusButton({
  source,
  label,
  variant = "primary",
}: {
  source: string;
  label: string;
  variant?: ButtonVariant;
}) {
  return (
    <Button
      variant={variant}
      onClick={() => openPaywall({ source })}
      icon={variant === "rect" ? <ArrowRightIcon size={18} strokeWidth={2.2} aria-hidden="true" /> : undefined}
    >
      {label}
    </Button>
  );
}
