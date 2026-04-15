#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/1win-crash}"
REPO_URL="${REPO_URL:-https://github.com/mkmk749278/1win.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
TARGET_USER="${SUDO_USER:-$USER}"
PROJECT_ENV_FILE="$DEPLOY_PATH/.env"

require_command() {
  command -v "$1" >/dev/null 2>&1 || return 1
}

install_system_packages() {
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git gnupg lsb-release ufw nginx certbot python3-certbot-nginx

  sudo install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  if [ ! -f /etc/apt/keyrings/nodesource.gpg ]; then
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    sudo chmod a+r /etc/apt/keyrings/nodesource.gpg
  fi

  echo \
    "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin nodejs
  sudo npm install -g pnpm pm2
  sudo systemctl enable --now docker
  sudo usermod -aG docker "$TARGET_USER" || true
}

configure_firewall() {
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
}

sync_repository() {
  sudo mkdir -p "$DEPLOY_PATH"
  sudo chown "$TARGET_USER":"$TARGET_USER" "$DEPLOY_PATH"

  if [ ! -d "$DEPLOY_PATH/.git" ]; then
    git clone "$REPO_URL" "$DEPLOY_PATH"
  fi

  cd "$DEPLOY_PATH"
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git reset --hard "origin/$DEPLOY_BRANCH"
}

bootstrap_env_file() {
  if [ ! -f "$PROJECT_ENV_FILE" ]; then
    cp "$DEPLOY_PATH/.env.vps.example" "$PROJECT_ENV_FILE"
    echo "Created $PROJECT_ENV_FILE from .env.vps.example. Update secrets before exposing the app publicly."
  fi
}

start_containers() {
  cd "$DEPLOY_PATH"
  docker compose pull || true
  docker compose up -d --build
  for attempt in 1 2 3 4 5 6; do
    if /usr/bin/env bash scripts/healthcheck.sh; then
      return
    fi

    echo "Healthcheck attempt $attempt failed; retrying in 5 seconds..."
    sleep 5
  done

  echo "Deployment healthchecks did not pass after retries." >&2
  return 1
}

main() {
  install_system_packages
  configure_firewall
  sync_repository
  bootstrap_env_file
  start_containers

  cat <<SUMMARY
VPS bootstrap complete.

Next steps:
1. Edit $PROJECT_ENV_FILE with your production domain, CORS origins, image tags, and secrets.
2. Copy $DEPLOY_PATH/configs/nginx/crash.conf to /etc/nginx/sites-available/crash.conf and update the server_name.
3. Enable the nginx site, run sudo nginx -t, and reload nginx.
4. Run sudo certbot --nginx -d your-domain.example once DNS is pointing to the VPS.
5. Re-login to refresh Docker group membership if you want to run docker without sudo.
SUMMARY
}

main "$@"
