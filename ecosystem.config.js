module.exports = {
  apps: [
    {
      name: 'BackNet-backend-dev',
      cwd: './backend',
      script: process.platform === 'win32' ? 'cmd' : 'npm',
      args: process.platform === 'win32' ? '/c npm run dev' : 'run dev',
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      log_file: './logs/backend-dev.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'BackNet-frontend-dev',
      cwd: './frontend',
      script: process.platform === 'win32' ? 'cmd' : 'npm',
      args: process.platform === 'win32' ? '/c npm start' : 'start',
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none'
      },
      log_file: './logs/frontend-dev.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};