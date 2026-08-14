import assert from "node:assert/strict";
import { callTool, McpToolError, TOOLS, validateToolArgs } from "../src/lib/mcp/tools";
import type { SessionUser } from "../src/lib/session";

const admin: SessionUser = {
  id: "mcp-contract-test",
  telegramId: null,
  googleId: null,
  email: "mcp-contract-test@inapp.invalid",
  username: null,
  firstName: "MCP contract test",
  premiumUntil: null,
  tokens: 0,
  lifetime: false,
  isAdmin: true,
};

const asRows = (value: unknown) => value as Array<Record<string, unknown>>;

async function main() {
  assert.equal(TOOLS.length, 16, "The public surface must contain 16 deliberate tools");
  assert.equal(new Set(TOOLS.map((tool) => tool.name)).size, TOOLS.length, "Tool names must be unique");
  for (const tool of TOOLS) {
    assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name} must reject accidental arguments`);
    assert.ok(tool.outputSchema, `${tool.name} must declare structured output`);
    assert.equal(tool.annotations.readOnlyHint, true, `${tool.name} must remain read-only`);
  }

  const first = await callTool("list_niches", { limit: 20 }, { user: null });
  assert.equal(first.total, 71, "Only the 71 fully supported niches should be advertised");
  assert.equal(asRows(first.niches).length, 20);
  assert.ok(first.nextCursor);
  assert.ok(!asRows(first.niches).some((niche) => niche.niche === "astrology"), "Unsupported astrology niche must not leak into discovery");

  const second = await callTool("list_niches", { limit: 20, cursor: first.nextCursor }, { user: null });
  const firstSlugs = new Set(asRows(first.niches).map((niche) => niche.niche));
  assert.ok(asRows(second.niches).every((niche) => !firstSlugs.has(niche.niche)), "Cursor pages must not overlap");

  const sample = await callTool("research_niche", { niche: "dating-apps" }, { user: null });
  assert.equal(sample.niche, "dating-apps");
  assert.ok(asRows(sample.topPains).length > 0, "The free sample must prove the review analysis is real");

  await assert.rejects(
    () => callTool("get_niche_brief", { niche: "dating-apps" }, { user: null }),
    (error: unknown) => error instanceof McpToolError && error.code === "payment_required",
    "Paid research must not leak to a free account",
  );

  const themes = await callTool("list_niche_themes", { niche: "dating-apps", polarity: "pain", limit: 10 }, { user: admin });
  assert.ok(asRows(themes.themes).length > 0, "Broad complaint questions must work without a search keyword");
  assert.ok(asRows(themes.themes).every((theme) => theme.polarity === "pain"));

  const apps = await callTool("list_niche_apps", { niche: "dating-apps", limit: 1 }, { user: admin });
  const appId = String(asRows(apps.apps)[0]?.appId ?? "");
  assert.ok(appId, "The app drill-down needs a stable App Store id");
  const reviews1 = await callTool("get_app_reviews", { niche: "dating-apps", appId, limit: 2, sort: "source" }, { user: admin });
  assert.equal(asRows(reviews1.reviews).length, 2);
  const review = asRows(reviews1.reviews)[0];
  assert.match(String(review.reviewId), /^rv_/);
  assert.equal(typeof review.text, "string");
  assert.equal(typeof review.rating, "number");
  assert.ok(Array.isArray(review.themes));
  assert.ok(String(review.appStoreUrl).startsWith("https://apps.apple.com/app/id"));
  const reviews2 = await callTool("get_app_reviews", { niche: "dating-apps", appId, limit: 2, sort: "source", cursor: reviews1.nextCursor }, { user: admin });
  const ids1 = new Set(asRows(reviews1.reviews).map((row) => row.reviewId));
  assert.ok(asRows(reviews2.reviews).every((row) => !ids1.has(row.reviewId)), "Review cursor pages must not overlap");

  assert.throws(() => validateToolArgs("get_app_reviews", { niche: "dating-apps", appId, minRating: 5, maxRating: 1 }), /minRating/);
  assert.throws(() => validateToolArgs("list_niches", { surprise: true }), /Unknown argument/);

  process.stdout.write("MCP contract tests passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
