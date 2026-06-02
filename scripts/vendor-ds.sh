#!/usr/bin/env bash
# Refresh the vendored tarballs of the @saverin design system.
#
# Why this exists: badcomment's UI is built on @saverin/ui-web + @saverin/tokens,
# which live in the sibling *private* repo ../portfolio. CI runners and the prod VM
# don't have that repo, so we ship the design system as committed npm tarballs under
# vendor/ and depend on them via `file:vendor/*.tgz`. Installing tarballs (rather
# than linking the live source) makes npm pull ui-web's own deps (cva/clsx/
# tailwind-merge) into node_modules and resolve react to badcomment's single copy —
# so the build is self-contained on any machine.
#
# Run this LOCALLY (where ../portfolio exists) whenever the design system changed
# and you want to deploy it, then commit vendor/. To preview live DS edits locally
# without re-packing, run: npm run ds:link  (links ../portfolio source over the
# tarballs; reverted by the next `npm ci`/`npm install`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/../portfolio/packages"
DEST="${ROOT}/vendor"

if [ ! -d "${SRC}/ui-web" ] || [ ! -d "${SRC}/tokens" ]; then
  echo "error: ../portfolio/packages not found — run this on a machine with the portfolio repo checked out next to badcomment." >&2
  exit 1
fi

mkdir -p "${DEST}"
rm -f "${DEST}"/saverin-*.tgz

# tokens first: ui-web depends on it, and npm resolves the @saverin/tokens it needs
# from the tokens tarball badcomment installs.
for pkg in tokens ui-web; do
  ( cd "${SRC}/${pkg}" && npm pack --pack-destination "${DEST}" )
done

echo ">> Packed design system into vendor/:"
ls -1 "${DEST}"/saverin-*.tgz
echo ">> Review & commit vendor/ to ship the change."
