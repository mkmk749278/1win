# Production deployment plan

## 1. Docker assets delivered in this repository

- `apps/backend/Dockerfile` builds the Fastify/WebSocket backend as a production image.
- `apps/bot-worker/Dockerfile` builds the bot worker and exposes `/health` on `BOT_HEALTH_PORT`.
- `apps/frontend/Dockerfile` builds the Vite frontend and serves it from nginx on port `8080`.
- `docker-compose.yml` runs the full stack with restart policies, healthchecks, rotated json-file logs, and localhost-only port bindings for nginx.
- `.env.vps.example` is the production environment template used by Docker Compose.

## 2. Fresh VPS workflow (Ubuntu 22.04)

1. Point DNS for your production domain to the VPS public IP.
2. SSH into the server as a sudo-enabled user.
3. Run the bootstrap script:
   ```bash
   cd /tmp
   curl -fsSL https://raw.githubusercontent.com/mkmk749278/1win/main/scripts/setup-vps.sh -o setup-vps.sh
   chmod +x setup-vps.sh
   ./setup-vps.sh
   ```
   Or, after cloning the repository locally on the VPS:
   ```bash
   cd /opt/1win-crash
   ./scripts/setup-vps.sh
   ```
4. Edit `/opt/1win-crash/.env` and set at least:
   - `CORS_ORIGINS=https://your-domain.example`
   - `VITE_API_BASE_URL=/api`
   - `VITE_WS_URL=/ws`
   - `IMAGE_TAG=latest` or a release SHA
   - `BOT_CONFIG_PATH=/app/configs/bots/conservative.json`
5. Copy the nginx config into place:
   ```bash
   sudo cp /opt/1win-crash/configs/nginx/crash.conf /etc/nginx/sites-available/crash.conf
   sudo ln -sf /etc/nginx/sites-available/crash.conf /etc/nginx/sites-enabled/crash.conf
   ```
6. Update `server_name` inside `/etc/nginx/sites-available/crash.conf` to your real domain.
7. Validate and reload nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
8. Issue the TLS certificate:
   ```bash
   sudo certbot --nginx -d your-domain.example
   ```
9. Validate the deployment:
   ```bash
   cd /opt/1win-crash
   docker compose ps
   ./scripts/healthcheck.sh
   docker compose logs --tail=100 backend
   docker compose logs --tail=100 bot-worker
   docker compose logs --tail=100 frontend
   ```

## 3. Host hardening and 24x7 operations

- `ufw` should allow only `OpenSSH`, `80/tcp`, and `443/tcp`.
- Docker services use `restart: unless-stopped` so they recover after reboots and daemon restarts.
- Logs rotate with Docker `json-file` limits (`10m` x `5`).
- All published ports bind to `127.0.0.1`, so only nginx is internet-facing.
- The bot worker now exposes `/health` and reports stale websocket connections as unhealthy.
- The backend now restricts CORS with `CORS_ORIGINS` instead of allowing every browser origin.

## 4. GitHub Actions deployment flow

The deployment workflow at `.github/workflows/deploy.yml` now:

1. Builds three production Docker images.
2. Pushes them to GHCR with `latest` and commit-SHA tags.
3. SSHes into the VPS.
4. Updates the checked-out repo on the server.
5. Pulls the new images and restarts the stack with Docker Compose.
6. Runs `/opt/1win-crash/scripts/healthcheck.sh`.
7. Posts a webhook notification on failure when `DEPLOY_WEBHOOK_URL` is configured.

### Required GitHub secrets

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_DEPLOY_PATH`
- `VPS_REGISTRY_USER`
- `VPS_REGISTRY_TOKEN`
- `DEPLOY_WEBHOOK_URL` (optional)

### Optional GitHub variables

- `REPO_URL`
- `FRONTEND_API_BASE_URL`
- `FRONTEND_WS_URL`

## 5. Environment and PM2 templates

### Docker Compose environment

Start from `.env.vps.example` and copy it to `/opt/1win-crash/.env`.

### PM2 fallback

Use `configs/pm2/ecosystem.config.cjs` when Docker is unavailable or you need a temporary non-container fallback.

```bash
cd /opt/1win-crash
pnpm install --frozen-lockfile
pnpm build
pm2 start configs/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

The PM2 template keeps backend and both bot profiles autorestarting with restart delays, memory limits, and explicit websocket/health ports.

## 6. Suggested database schema

PostgreSQL is the better default here because crash rounds, bot actions, and daily metrics are relational, query-heavy, and benefit from transactions, indexes, and time-based reporting. Recommended schema:

```sql
create table crash_rounds (
  id bigserial primary key,
  round_id text not null unique,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  crash_at numeric(8,2) not null,
  duration_ms integer not null,
  instant_bust boolean not null default false,
  signal_level text,
  signal_message text,
  created_at timestamptz not null default now()
);

create table bot_runs (
  id bigserial primary key,
  bot_name text not null,
  strategy text not null,
  config_snapshot jsonb not null,
  started_at timestamptz not null,
  stopped_at timestamptz,
  status text not null,
  created_at timestamptz not null default now()
);

create table bot_actions (
  id bigserial primary key,
  bot_run_id bigint not null references bot_runs(id) on delete cascade,
  round_id text not null,
  action_type text not null,
  target_multiplier numeric(8,2) not null,
  suggested_stake numeric(10,2),
  decision_reason text not null,
  dry_run boolean not null,
  created_at timestamptz not null default now()
);

create table bot_metrics_daily (
  id bigserial primary key,
  bot_name text not null,
  metric_date date not null,
  simulated_entries integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  pnl numeric(12,2) not null default 0,
  unique (bot_name, metric_date)
);
```

MongoDB is acceptable if you prefer event documents and flexible bot config snapshots, but PostgreSQL fits better once you add round analytics, leaderboards, and operator dashboards.

## 7. Gap-filling recommendations

### Crash fairness and realism

- The backend now uses a long-tail multiplier distribution with configurable `CRASH_HOUSE_EDGE` and `CRASH_INSTANT_BUST_PROBABILITY`.
- Next improvement: add a server seed + client seed + nonce history so each round can expose a provably-fair verification record.
- Persist every round in PostgreSQL and publish a fairness report page in the frontend.

### Frontend UX

- Keep the current live chart, multiplier card, and signal panel, but add round countdown, crash history badges, and reconnect banners next.
- Add `/state` polling fallback for browsers that temporarily lose websocket connectivity.
- Add Sentry or OpenTelemetry browser instrumentation for websocket failures and rendering regressions.

### Bot modularity

- The worker now uses a strategy registry, making new strategies additive instead of hard-coded conditionals.
- Next step: move strategy parameters into per-bot JSON config so each strategy can declare its own thresholds and bankroll rules.
- Persist every decision to the suggested `bot_actions` table for later tuning.

### Logging, error handling, and monitoring

- Keep structured stdout logging with Pino and Docker log rotation.
- Add uptime checks from Better Stack, Healthchecks.io, or Uptime Kuma against `/health` and `/api/health`.
- Add Grafana + Prometheus or OpenTelemetry Collector if you need latency, reconnect, and round-volume metrics.
- Alert on repeated bot reconnect loops, failed healthchecks, high memory restarts, and unusual crash-point distributions.

## 8. Day-2 maintenance checklist

- Run `docker compose pull && docker compose up -d` for controlled image rollouts.
- Keep Ubuntu security updates, Docker Engine, and nginx patched.
- Back up `.env`, bot configs, and future database volumes before every release.
- Rotate GHCR tokens and SSH keys regularly.
- Review container logs and healthcheck history daily for the first production week.
