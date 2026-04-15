#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=/opt/1win-crash
FRONTEND_ROOT=/var/www/1win-crash/frontend

cd "$PROJECT_ROOT"
pnpm install --frozen-lockfile
pnpm build
sudo mkdir -p "$FRONTEND_ROOT"
sudo rsync -av --delete apps/frontend/dist/ "$FRONTEND_ROOT/"
pm2 startOrReload configs/pm2/ecosystem.config.cjs
