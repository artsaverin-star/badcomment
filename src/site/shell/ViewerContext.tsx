"use client";

import { createContext, useContext } from "react";
import type { ViewerSummary } from "../access";

// The signed-in state for client components (from getViewer() in the root layout).
// Server components should call getViewer() directly instead.

const GUEST: ViewerSummary = { loggedIn: false, plus: false, user: null };

export const ViewerContext = createContext<ViewerSummary>(GUEST);

export function useViewer(): ViewerSummary {
  return useContext(ViewerContext);
}
