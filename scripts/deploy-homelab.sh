#!/usr/bin/env bash
# Puts the committed code on the homelab and restarts Discere there. See docs/homelab.md.
#
#   scripts/deploy-homelab.sh
#
# The machine comes from HOMELAB_SSH, or from the first line of `.homelab` at the repository root
# (git ignores it), as user@host. This repository is public, so the address is kept out of it.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${HOMELAB_SSH:-$(head -n1 .homelab 2>/dev/null || true)}"
if [ -z "$TARGET" ]; then
  echo "Say which machine: HOMELAB_SSH=user@host, or put user@host in .homelab." >&2
  exit 1
fi
SHA=$(git rev-parse --short HEAD)
PNPM="npx -y pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
ROOT=/srv/discere

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes are not deployed: this sends commit $SHA." >&2
fi

ssh -o BatchMode=yes "$TARGET" "test -f $ROOT/discere.env" || {
  echo "The homelab has no $ROOT/discere.env. Run deploy/homelab/setup-service-user.sh there once (docs/homelab.md)." >&2
  exit 1
}

# Each deploy unpacks into its own folder; `current` moves only once the build has passed, so a
# failed build leaves the running copy alone. Data and settings live outside the releases.
git archive --format=tar HEAD |
  ssh -o BatchMode=yes "$TARGET" "set -e; rm -rf $ROOT/releases/$SHA; mkdir $ROOT/releases/$SHA; tar -x -C $ROOT/releases/$SHA"

ssh -o BatchMode=yes "$TARGET" "set -e
  cd $ROOT/releases/$SHA
  $PNPM install --frozen-lockfile --reporter=silent
  $PNPM --filter @discere/web build >/dev/null
  chmod -R go+rX .
  ln -sfn releases/$SHA $ROOT/current
  sudo -n /usr/bin/systemctl restart discere.service
  # Keeps the running release and the one before it.
  cd $ROOT/releases && ls -1t | tail -n +3 | xargs -r rm -rf"

PORT=$(ssh -o BatchMode=yes "$TARGET" "grep -E '^PORT=' $ROOT/discere.env | cut -d= -f2" 2>/dev/null || true)
echo "Waiting for Discere on the homelab ..."
for _ in $(seq 1 60); do
  if ssh -o BatchMode=yes "$TARGET" "curl -fsS -m 3 http://127.0.0.1:${PORT:-8790}/api/health" >/dev/null 2>&1; then
    echo "Running commit $SHA on the homelab, port ${PORT:-8790}."
    exit 0
  fi
  sleep 2
done
echo "Discere did not answer. Check on the homelab: journalctl -u discere -n 50" >&2
exit 1
