module.exports = {
  apps: [
    // --- DESENVOLVIMENTO ---
    {
      name: 'backend-dev',
      cwd: './backend',
      script: 'run-dev.js',
      interpreter: 'node',
      node_args: '--watch',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3001
      },
      log_file: './logs/backend-dev-combined.log',
      out_file: './logs/backend-dev-out.log',
      error_file: './logs/backend-dev-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true
    },
    {
      name: 'frontend-dev',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'development'
      },
      log_file: './logs/frontend-dev-combined.log',
      out_file: './logs/frontend-dev-out.log',
      error_file: './logs/frontend-dev-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true
    },
    // --- PRODUÇÃO ---
    {
      name: 'backend',
      cwd: './backend',
      script: './dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
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
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      },
      log_file: './logs/frontend-combined.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true
    }
  ]
};
