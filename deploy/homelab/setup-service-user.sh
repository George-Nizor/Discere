#!/usr/bin/env bash
# One-time move of Discere from the deploying user's own systemd service to a system service run
# by its own unprivileged user. Run once on the homelab, with sudo, after a deploy that includes
# this file:
#
#   sudo bash ~/discere-setup/setup-service-user.sh "$USER"
#
# with this folder (deploy/homelab) copied to ~/discere-setup first.
#
# It is safe to run again. It copies the existing data and settings and never deletes the old
# ones, which stay in ~/discere until removed by hand. See docs/homelab.md.
set -euo pipefail

DEPLOYER="${1:?Give the user who deploys, such as: sudo bash setup-service-user.sh \"\$USER\"}"
[ "$(id -u)" -eq 0 ] || { echo "Run this with sudo." >&2; exit 1; }
id "$DEPLOYER" >/dev/null
DEPLOYER_HOME=$(getent passwd "$DEPLOYER" | cut -d: -f6)
OLD="$DEPLOYER_HOME/discere"
ROOT=/srv/discere
# The service file and settings template come from beside this script, not from a release.
HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

# 1. The user: no shell, no sudo, no docker, a home that is not a login home.
if ! id discere >/dev/null 2>&1; then
  useradd --system --home-dir "$ROOT" --no-create-home --shell /usr/sbin/nologin discere
fi

# 2. The folders. Releases belong to the deploying user and are read-only to Discere; only the
#    data folder is Discere's to write.
mkdir -p "$ROOT/releases" "$ROOT/data"
chown "$DEPLOYER":discere "$ROOT" "$ROOT/releases"
chmod 755 "$ROOT" "$ROOT/releases"
chown discere:discere "$ROOT/data"
chmod 750 "$ROOT/data"

# 3. Stop the old per-user service, if there is one.
DEPLOYER_UID=$(id -u "$DEPLOYER")
sudo -u "$DEPLOYER" XDG_RUNTIME_DIR="/run/user/$DEPLOYER_UID" \
  systemctl --user disable --now discere.service >/dev/null 2>&1 || true

# 4. Copy the data and the settings across. The old copies are left where they were.
if [ -d "$OLD/data" ] && [ -z "$(ls -A "$ROOT/data")" ]; then
  cp -a "$OLD/data/." "$ROOT/data/"
  chown -R discere:discere "$ROOT/data"
fi
if [ ! -f "$ROOT/discere.env" ]; then
  if [ -f "$OLD/discere.env" ]; then cp "$OLD/discere.env" "$ROOT/discere.env"
  else cp "$HERE/discere.env.example" "$ROOT/discere.env"; fi
fi
sed -i "s#^DISCERE_DATA_DIR=.*#DISCERE_DATA_DIR=$ROOT/data#" "$ROOT/discere.env"
chown "$DEPLOYER":discere "$ROOT/discere.env"
chmod 640 "$ROOT/discere.env"

# 5. The running release, so the service has something to start before the next deploy.
if [ ! -e "$ROOT/current" ] && [ -e "$OLD/current" ]; then
  RELEASE=$(basename "$(readlink -f "$OLD/current")")
  cp -a "$(readlink -f "$OLD/current")" "$ROOT/releases/$RELEASE"
  chown -R "$DEPLOYER":"$DEPLOYER" "$ROOT/releases/$RELEASE"
  ln -sfn "releases/$RELEASE" "$ROOT/current"
  chown -h "$DEPLOYER":discere "$ROOT/current"
fi

# 6. The deploying user may restart Discere, and nothing else, without a password.
cat > /etc/sudoers.d/discere-deploy <<EOF
$DEPLOYER ALL=(root) NOPASSWD: /usr/bin/systemctl restart discere.service, /usr/bin/systemctl daemon-reload
EOF
chmod 440 /etc/sudoers.d/discere-deploy
visudo -cf /etc/sudoers.d/discere-deploy >/dev/null

# 7. The system service.
cp "$HERE/discere.service" /etc/systemd/system/discere.service
systemctl daemon-reload
systemctl enable --now discere.service >/dev/null
systemctl restart discere.service

PORT=$(grep -E '^PORT=' "$ROOT/discere.env" | cut -d= -f2)
for _ in $(seq 1 30); do
  if curl -fsS -m 3 "http://127.0.0.1:${PORT:-8790}/api/health" >/dev/null 2>&1; then
    echo "Discere runs as the discere user from $ROOT. The old copy in $OLD can be removed by hand."
    exit 0
  fi
  sleep 2
done
echo "Discere did not answer. Check: journalctl -u discere -n 50" >&2
exit 1
