#!/usr/bin/env bash
# Atualização manual da wiki após deploy (dist vem do GitHub Actions).
set -euo pipefail

cd "$(dirname "$0")/.."
git pull
test -f doc/.vitepress/dist/index.html
pm2 reload ecosystem.config.js --only doc 2>/dev/null || pm2 start ecosystem.config.js --only doc
pm2 save
echo "Wiki atualizada."
