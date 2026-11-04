#!/bin/sh
# Replays every fix on the committed bundle. Run from this folder.
set -e
cd "$(dirname "$0")/../../.."
git checkout content/the-web-html-css-javascript/bundle.json
cd .author/the-web-html-css-javascript/fix
for f in intro l01 l02 l03 l04 l05 l06 l07 l08 l09 l10 l11 l12 l13 l14 positions backticks; do
  [ -f "$f.cjs" ] && node "$f.cjs"
done
