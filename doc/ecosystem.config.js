module.exports = {
  apps: [
    {
      name: 'doc',
      cwd: __dirname,
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
      }
    }
  ]
}
