#!/bin/bash
# Publica frontend/build em /var/www para o Nginx (www-data).
# Uso: sudo RUN_USER=ispconsultor bash scripts/publish-frontend-www.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_ROOT="${SOURCE_ROOT:-$PROJECT_ROOT/frontend/build}"
WEB_ROOT="${NGINX_WEB_ROOT:-/var/www/ispconsultor}"
APP_USER="${RUN_USER:-${SUDO_USER:-}}"

if [ ! -f "$SOURCE_ROOT/index.html" ]; then
  echo "Erro: $SOURCE_ROOT/index.html não encontrado" >&2
  exit 1
fi

mkdir -p "$WEB_ROOT"

if command -v rsync &>/dev/null; then
  rsync -a --delete "$SOURCE_ROOT/" "$WEB_ROOT/"
else
  find "$WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$SOURCE_ROOT/." "$WEB_ROOT/"
fi

if [ "$(id -u)" -eq 0 ]; then
  if [ -z "$APP_USER" ]; then
    echo "Erro: defina RUN_USER ou execute com sudo a partir de um usuário da aplicação" >&2
    exit 1
  fi
  chown -R "$APP_USER":www-data "$WEB_ROOT"
  usermod -aG www-data "$APP_USER" 2>/dev/null || true
else
  if [ ! -w "$WEB_ROOT" ]; then
    echo "Erro: sem permissão de escrita em $WEB_ROOT (use: sudo RUN_USER=ispconsultor bash $0)" >&2
    exit 1
  fi
fi

# Nginx (www-data) lê via grupo ou others — o= bloqueia e gera 403 em /saas após self-update sem sudo
chmod -R u=rwX,go=rX "$WEB_ROOT"
echo "Frontend publicado em $WEB_ROOT"
