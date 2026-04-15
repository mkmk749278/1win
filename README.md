# 1win Crash Simulator

A monorepo starter for a **simulation-first** crash game dashboard, round engine, and configurable bot workers. The project is intentionally built around local testing and VPS deployment without connecting to any external wagering API.

## Project structure

```text
<project-root>
├── apps
│   ├── backend      # Fastify + WebSocket crash simulator
│   ├── bot-worker   # Config-driven simulation bots
│   └── frontend     # React + Vite dashboard
├── packages
│   └── shared       # Shared event and config types
├── configs          # Bot, PM2, nginx, and supervisor configs
├── scripts          # VPS setup and health scripts
└── .github/workflows
```

## Requirements

- Node.js 20+
- Corepack-enabled pnpm
- Optional: nginx, PM2, certbot for VPS deployment

## Install

```bash
cd <project-root>
corepack enable
pnpm install
cp .env.example .env
```

## Development

Run each service in a separate shell:

```bash
cd <project-root>
pnpm dev:backend
pnpm dev:frontend
pnpm dev:bot
```

Backend health endpoint: `http://localhost:3001/health`

Frontend: `http://localhost:5173`

## Validation

```bash
cd <project-root>
pnpm lint
pnpm test
pnpm build
```

## Backend overview

- `apps/backend/src/game/crashEngine.ts` drives multiplier growth and random crash-point generation.
- `apps/backend/src/game/roundManager.ts` runs the prepare/live/crash loop, records round history, and emits signals.
- `apps/backend/src/server/websocket.ts` exposes a `/ws` endpoint for frontend and bot clients.

## Bot overview

Bots are **simulation-only**. They never call a third-party betting API. Each bot loads a JSON config from `/home/runner/work/1win/1win/configs/bots` and applies a strategy module.

Supported strategies:

- `fixedTarget`: waits for a positive signal, then simulates a cashout at a configured multiplier.
- `fibonacci`: increases a simulated stake step after volatile crash streaks.

Safety controls included in bot configs:

- `dryRun`
- `maxSimulatedEntriesPerDay`
- `cooldownRounds`
- `reconnectDelayMs`

## VPS deployment guide

1. Provision Ubuntu 22.04+ and allow ports `80`, `443`, and `22`.
2. Install system packages:
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx git curl build-essential
   ```
3. Install Node.js and runtime tools:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pnpm pm2
   ```
4. Clone and build the project:
   ```bash
   sudo mkdir -p /opt/1win-crash
   sudo chown "$USER":"$USER" /opt/1win-crash
   git clone https://github.com/mkmk749278/1win.git /opt/1win-crash
   cd /opt/1win-crash
   pnpm install
   pnpm build
   cp .env.example .env
   ```
5. Start long-running services:
   ```bash
   pm2 start configs/pm2/ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
6. Publish frontend assets:
   ```bash
   sudo mkdir -p /var/www/1win-crash/frontend
   sudo rsync -av --delete apps/frontend/dist/ /var/www/1win-crash/frontend/
   ```
7. Configure nginx:
   ```bash
   sudo cp configs/nginx/crash.conf /etc/nginx/sites-available/crash.conf
   sudo ln -sf /etc/nginx/sites-available/crash.conf /etc/nginx/sites-enabled/crash.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```
8. Enable HTTPS:
   ```bash
   sudo certbot --nginx -d crash.example.com
   ```
9. Verify health:
   ```bash
   pm2 status
   pm2 logs crash-backend
   /opt/1win-crash/scripts/healthcheck.sh
   ```

## GitHub Actions

- `ci.yml` installs dependencies, lints, tests, and builds every push and pull request.
- `deploy.yml` is a manual workflow template for SSH-based VPS deploys.

## Security and scalability recommendations

- Keep the bot layer in dry-run mode until a reviewed action adapter exists.
- Add authentication and origin checks before exposing `/ws` publicly.
- Move live round state to Redis and durable history to PostgreSQL when scaling beyond one backend instance.
- Rotate logs, alert on reconnect loops, and run PM2 under a non-root user.
