#!/usr/bin/env bash
set -euo pipefail

BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://127.0.0.1:${BACKEND_BIND_PORT:-3001}/health}"
BOT_HEALTH_URL="${BOT_HEALTH_URL:-http://127.0.0.1:${BOT_BIND_HEALTH_PORT:-3002}/health}"
FRONTEND_HEALTH_URL="${FRONTEND_HEALTH_URL:-http://127.0.0.1:${FRONTEND_BIND_PORT:-8080}/health}"

curl --fail --silent "$BACKEND_HEALTH_URL" | grep -E '"ok"[[:space:]]*:[[:space:]]*true'
curl --fail --silent "$BOT_HEALTH_URL" | grep -E '"ok"[[:space:]]*:[[:space:]]*true'
curl --fail --silent "$FRONTEND_HEALTH_URL" | grep -E '"ok"[[:space:]]*:[[:space:]]*true|^ok$'
