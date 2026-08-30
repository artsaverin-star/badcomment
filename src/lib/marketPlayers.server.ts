import fs from "node:fs";
import path from "node:path";
import queries from "@/data/marketPlayerQueries.json";
import type { MarketSnapshot } from "@/lib/marketPlayers";

// Read only the requested niche. Never import the complete app catalog into
// a client bundle or send unrelated niches through the server payload.
export function marketPlayersFor(slug: string): MarketSnapshot | null {
  if (!Object.hasOwn(queries, slug)) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/marketPlayers", `${slug}.json`), "utf8")) as MarketSnapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
