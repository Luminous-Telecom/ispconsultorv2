module.exports = {
  apps: [
    {
      name: 'BackNet-backend',
      cwd: './backend',
      script: './dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
      },
      log_file: './logs/backend-combined.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true,
      max_memory_restart: '2G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
