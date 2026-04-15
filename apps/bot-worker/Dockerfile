# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/bot-worker/package.json apps/bot-worker/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile
COPY apps/bot-worker apps/bot-worker
COPY packages/shared packages/shared
RUN pnpm --filter @crash/shared build \
  && pnpm --filter @crash/bot-worker build \
  && pnpm deploy --legacy --filter @crash/bot-worker --prod /prod/bot-worker

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV BOT_HEALTH_PORT=3002
WORKDIR /app
COPY --from=build --chown=node:node /prod/bot-worker ./
RUN mkdir -p /app/configs/bots && chown -R node:node /app
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]
