import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { canUseWorkspaceBeta } from "../src/lib/workspaceAccess";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const owner = { isAdmin: true, username: "@artSaverin" };
assert.equal(canUseWorkspaceBeta(owner), true, "the owner admin must have beta access");
assert.equal(canUseWorkspaceBeta({ isAdmin: true, username: "another-admin" }), false, "another admin must not have beta access");
assert.equal(canUseWorkspaceBeta({ isAdmin: false, username: "artSaverin" }), false, "the username alone must not grant beta access");
assert.equal(canUseWorkspaceBeta(null), false, "anonymous access must stay closed");

const indexPage = read("src/app/workspace/page.tsx");
const categoryPage = read("src/app/workspace/[slug]/page.tsx");
const header = read("src/components/Header.tsx");
const layout = read("src/app/layout.tsx");
const nav = read("src/components/CategoryWorkspaceNav.tsx");
const betaSource = [indexPage, categoryPage, nav].join("\n").toLowerCase();

for (const source of [indexPage, categoryPage]) {
  assert.match(source, /canUseWorkspaceBeta\(user\)/, "every beta page must verify the owner");
  assert.match(source, /notFound\(\)/, "every beta page must fail closed");
  assert.match(source, /robots:\s*\{ index: false, follow: false \}/, "beta pages must be noindex");
}

assert.match(header, /item\.key !== "workspace" \|\| showWorkspace/, "the beta nav item must be hidden by default");
assert.match(layout, /showWorkspace=\{canUseWorkspaceBeta\(access\.user\)\}/, "layout must reveal beta only to the owner");

for (const view of ["overview", "apps", "ideas", "reviews", "build"]) {
  assert.ok(nav.includes(`key: "${view}"`), `workspace navigation must include ${view}`);
}

for (const publicPage of [
  "src/app/segment/[slug]/page.tsx",
  "src/app/rating/[slug]/page.tsx",
  "src/app/ideas/page.tsx",
  "src/app/reviews/[slug]/page.tsx",
  "src/app/build/[slug]/page.tsx",
]) {
  assert.doesNotMatch(read(publicPage), /CategoryWorkspaceNav|\/workspace\//, `${publicPage} must remain public-structure code`);
}

for (const phrase of [
  "живой пример",
  "на наших данных",
  "в одном месте",
  "погруз",
  "революц",
  "магич",
  "game-changing",
  "supercharge",
  "seamless",
  "effortless",
]) {
  assert.equal(betaSource.includes(phrase), false, `beta copy contains banned phrase: ${phrase}`);
}

console.log("workspace beta contract: ok");
