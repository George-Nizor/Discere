#!/usr/bin/env bash
# Puts the committed code on the homelab and (re)starts Discere there. See docs/homelab.md.
#   scripts/deploy-homelab.sh
# HOMELAB_SSH picks another machine: HOMELAB_SSH=user@host scripts/deploy-homelab.sh
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${HOMELAB_SSH:-gnizorid@192.168.0.11}"
SHA=$(git rev-parse --short HEAD)
PNPM="npx -y pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes are not deployed: this sends commit $SHA." >&2
fi

# Each deploy unpacks into its own folder; `current` moves only once the build has passed, so a
# failed build leaves the running copy alone. The data folder and settings live outside them.
git archive --format=tar HEAD |
  ssh -o BatchMode=yes "$TARGET" "set -e; mkdir -p discere/releases discere/data; rm -rf discere/releases/$SHA; mkdir discere/releases/$SHA; tar -x -C discere/releases/$SHA"

ssh -o BatchMode=yes "$TARGET" "set -e
  cd discere/releases/$SHA
  $PNPM install --frozen-lockfile --reporter=silent
  $PNPM --filter @discere/web build >/dev/null
  cd ~/discere
  [ -f discere.env ] || cp releases/$SHA/deploy/homelab/discere.env.example discere.env
  ln -sfn releases/$SHA current
  mkdir -p ~/.config/systemd/user
  cp current/deploy/homelab/discere.service ~/.config/systemd/user/discere.service
  systemctl --user daemon-reload
  systemctl --user enable discere.service >/dev/null 2>&1
  systemctl --user restart discere.service
  # Keeps the running release and the one before it.
  ls -1t releases | tail -n +3 | xargs -r -I{} rm -rf releases/{}"

PORT=$(ssh -o BatchMode=yes "$TARGET" "grep -E '^PORT=' discere/discere.env | cut -d= -f2")
echo "Waiting for Discere on the homelab ..."
for _ in $(seq 1 60); do
  if ssh -o BatchMode=yes "$TARGET" "curl -fsS -m 3 http://127.0.0.1:${PORT:-8790}/api/health" >/dev/null 2>&1; then
    echo "Running commit $SHA on the homelab, port ${PORT:-8790}."
    exit 0
  fi
  sleep 2
done
echo "Discere did not answer. Check: ssh $TARGET journalctl --user -u discere -n 50" >&2
exit 1
