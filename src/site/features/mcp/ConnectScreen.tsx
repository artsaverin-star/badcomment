"use client";

import { useEffect, useRef } from "react";
import { useWeb } from "@/site/i18n/client";
import { openSignIn } from "@/site/shell/actions";
import type { ShellStrings } from "@/site/shell/strings";
import { useViewer } from "@/site/shell/ViewerContext";
import { Button, Heading } from "@/site/ui";
import type { McpStrings } from "./strings";

// The sign-in bridge of the MCP OAuth flow (/<L>/mcp/connect?o=…). A signed-out browser lands
// here from /api/mcp/oauth/authorize; the sign-in sheet opens by itself, and once the viewer is
// signed in (Telegram refreshes the tree; Google and e-mail come back to this URL, where the
// server redirects at once) the browser continues to the consent screen.
// The page wraps it in the one-column stack (gap 24): the fixed Georgia heading, then the
// primary button. No eyebrow (R6).

export function ConnectScreen({ authorizeUrl }: { authorizeUrl: string }) {
  const s = useWeb<McpStrings>("mcp");
  const shell = useWeb<ShellStrings>("shell");
  const viewer = useViewer();
  const opened = useRef(false);

  useEffect(() => {
    if (viewer.loggedIn) {
      window.location.assign(authorizeUrl);
      return;
    }
    if (opened.current) return;
    opened.current = true;
    const timer = window.setTimeout(() => openSignIn({ reason: "mcp" }), 0);
    return () => window.clearTimeout(timer);
  }, [viewer.loggedIn, authorizeUrl]);

  return (
    <>
      <Heading className="ia-heading--fixed" title={s.connectTitle} subtitle={s.connectBody} />
      {viewer.loggedIn ? (
        <Button variant="primary" href={authorizeUrl} external>
          {s.connectContinue}
        </Button>
      ) : (
        <Button variant="primary" onClick={() => openSignIn({ reason: "mcp" })}>
          {shell.signIn}
        </Button>
      )}
    </>
  );
}
