module.exports = {
  apps: [
    {
      name: 'crash-backend',
      cwd: '/opt/1win-crash',
      script: 'apps/backend/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'bot-conservative',
      cwd: '/opt/1win-crash',
      script: 'apps/bot-worker/dist/index.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        BOT_CONFIG_PATH: '/opt/1win-crash/configs/bots/conservative.json',
        BACKEND_WS_URL: 'ws://127.0.0.1:3001/ws'
      }
    },
    {
      name: 'bot-aggressive',
      cwd: '/opt/1win-crash',
      script: 'apps/bot-worker/dist/index.js',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        BOT_CONFIG_PATH: '/opt/1win-crash/configs/bots/aggressive.json',
        BACKEND_WS_URL: 'ws://127.0.0.1:3001/ws'
      }
    }
  ]
};
