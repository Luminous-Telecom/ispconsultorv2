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
    {
      name: 'doc-dev',
      cwd: './doc',
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
      log_file: './logs/doc-dev-combined.log',
      out_file: './logs/doc-dev-out.log',
      error_file: './logs/doc-dev-error.log',
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
      name: 'doc',
      cwd: './doc',
      script: 'node_modules/vitepress/bin/vitepress.js',
      args: 'preview --port 4000 --host 0.0.0.0',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      log_file: './logs/doc-combined.log',
      out_file: './logs/doc-out.log',
      error_file: './logs/doc-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true
    },
  ]
};
