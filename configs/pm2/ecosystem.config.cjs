const projectRoot = process.env.PROJECT_ROOT ?? '/opt/1win-crash';
const backendWsUrl = process.env.BACKEND_WS_URL ?? 'ws://127.0.0.1:3001/ws';

module.exports = {
  apps: [
    {
      name: 'crash-backend',
      cwd: projectRoot,
      script: 'apps/backend/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      kill_timeout: 5000,
      time: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        BACKEND_PORT: 3001,
        CORS_ORIGINS: 'https://crash.example.com'
      }
    },
    {
      name: 'bot-conservative',
      cwd: projectRoot,
      script: 'apps/bot-worker/dist/index.js',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      time: true,
      env: {
        NODE_ENV: 'production',
        BOT_CONFIG_PATH: `${projectRoot}/configs/bots/conservative.json`,
        BACKEND_WS_URL: backendWsUrl,
        BOT_HEALTH_PORT: 3002
      }
    },
    {
      name: 'bot-aggressive',
      cwd: projectRoot,
      script: 'apps/bot-worker/dist/index.js',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      time: true,
      env: {
        NODE_ENV: 'production',
        BOT_CONFIG_PATH: `${projectRoot}/configs/bots/aggressive.json`,
        BACKEND_WS_URL: backendWsUrl,
        BOT_HEALTH_PORT: 3003
      }
    }
  ]
};
