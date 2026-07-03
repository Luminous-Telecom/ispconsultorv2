#!/bin/bash
# ISP Consultor — instalação completa em Linux (Debian/Ubuntu) a partir do zero.
# Instala dependências de sistema, MariaDB, Redis, Elasticsearch, Krill, Node.js,
# PM2, Nginx; configura backend/.env; builda e sobe a aplicação em produção.
#
# Uso (a partir da raiz do repositório clonado):
#   sudo bash scripts/install.sh
#
# Requisitos: usuário com sudo (não execute como root direto — use sudo).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"
ENV_EXAMPLE="$PROJECT_ROOT/backend/.env.example"
NODE_MAJOR="${NODE_MAJOR:-24}"
DB_NAME="${DB_NAME:-ispconsultor}"
DB_USER="${DB_USER:-ispconsultor}"

# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------

log() { echo ">>> $*"; }

die() {
  echo "Erro: $*" >&2
  exit 1
}

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    die "Execute com sudo: sudo bash scripts/install.sh"
  fi
}

require_sudo_user() {
  export RUN_USER="${SUDO_USER:-}"
  if [ -z "$RUN_USER" ] || [ "$RUN_USER" = "root" ]; then
    die "Execute como usuário normal com sudo (ex.: lucas), não como root login."
  fi
}

run_as_app_user() {
  sudo -u "$RUN_USER" -H bash -lc "cd '$PROJECT_ROOT' && $*"
}

set_env_var() {
  local file="$1" key="$2" val="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    grep -v "^${key}=" "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
  fi
  printf '%s=%s\n' "$key" "$val" >> "$file"
}

prompt_password() {
  local label="$1" var_name="$2" min_len="${3:-8}"
  local pass pass2
  while true; do
    read -rsp "$label: " pass
    echo ""
    if [ "${#pass}" -lt "$min_len" ]; then
      echo "  Senha deve ter pelo menos ${min_len} caracteres."
      continue
    fi
    read -rsp "  Confirme a senha: " pass2
    echo ""
    if [ "$pass" != "$pass2" ]; then
      echo "  Senhas não conferem. Tente novamente."
      continue
    fi
    printf -v "$var_name" '%s' "$pass"
    break
  done
}

prompt_base_url() {
  local input
  while true; do
    read -rp "URL pública do sistema (ex.: http://erp.suaempresa.com.br): " input
    input="${input%/}"
    if [[ ! "$input" =~ ^https?://[^/]+ ]]; then
      echo "  Informe uma URL válida começando com http:// ou https://"
      continue
    fi
    BASE_URL="$input"
    break
  done
}

generate_secret() {
  openssl rand -base64 48 | tr -d '=/+' | head -c "$1"
}

generate_ssh_key() {
  openssl rand -base64 32 | head -c 32
}

wait_for_apt() {
  local waited=0 max="${APT_LOCK_WAIT_SECONDS:-300}"
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
     || fuser /var/lib/dpkg/lock >/dev/null 2>&1 \
     || fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
    if [ "$waited" -eq 0 ]; then
      log "Aguardando liberação do apt..."
    fi
    if [ "$waited" -ge "$max" ]; then
      die "apt bloqueado há mais de ${max}s. Tente novamente mais tarde."
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

apt_install() {
  wait_for_apt
  DEBIAN_FRONTEND=noninteractive apt-get "$@"
}

# ---------------------------------------------------------------------------
# Início
# ---------------------------------------------------------------------------

require_root
require_sudo_user

echo "=== ISP Consultor — instalação completa ==="
echo "Projeto: $PROJECT_ROOT"
echo "Usuário da aplicação: $RUN_USER"
echo ""

if [ ! -f "$ENV_EXAMPLE" ]; then
  die "Arquivo não encontrado: $ENV_EXAMPLE (execute a partir do repositório clonado)."
fi

# ---------------------------------------------------------------------------
# Coleta interativa
# ---------------------------------------------------------------------------

prompt_password "Senha do banco de dados (MariaDB, usuário $DB_USER)" DB_PASSWORD 8
prompt_base_url

DOMAIN="${BASE_URL#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

read -rp "Instalar e configurar Nginx como proxy reverso? [S/n]: " INSTALL_NGINX
INSTALL_NGINX="${INSTALL_NGINX:-S}"
INSTALL_NGINX="$(echo "$INSTALL_NGINX" | tr '[:upper:]' '[:lower:]')"

JWT_SECRET="$(generate_secret 64)"
SSH_ENCRYPTION_KEY="$(generate_ssh_key)"

log "Gerando backend/.env..."
cp "$ENV_EXAMPLE" "$ENV_FILE"
set_env_var "$ENV_FILE" "PORT" "3001"
set_env_var "$ENV_FILE" "BASE_URL" "$BASE_URL"
set_env_var "$ENV_FILE" "DB_HOST" "localhost"
set_env_var "$ENV_FILE" "DB_PORT" "3306"
set_env_var "$ENV_FILE" "DB_NAME" "$DB_NAME"
set_env_var "$ENV_FILE" "DB_USER" "$DB_USER"
set_env_var "$ENV_FILE" "DB_PASSWORD" "$DB_PASSWORD"
set_env_var "$ENV_FILE" "JWT_SECRET" "$JWT_SECRET"
set_env_var "$ENV_FILE" "JWT_EXPIRES_IN" "24h"
set_env_var "$ENV_FILE" "ALLOWED_ORIGINS" "${BASE_URL},https://localhost"
set_env_var "$ENV_FILE" "REDIS_URL" "redis://localhost:6379"
set_env_var "$ENV_FILE" "SSH_ENCRYPTION_KEY" "$SSH_ENCRYPTION_KEY"
set_env_var "$ENV_FILE" "NODE_ENV" "production"

chown "$RUN_USER:$RUN_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------------------
# Pacotes de sistema
# ---------------------------------------------------------------------------

if ! command -v apt-get &>/dev/null; then
  die "Este script suporta Debian/Ubuntu (apt). Para outras distros, instale manualmente."
fi

log "Atualizando índice de pacotes..."
apt_install update -y

log "Instalando ferramentas de build e dependências nativas..."
apt_install install -y \
  curl ca-certificates gnupg lsb-release git \
  build-essential python3 \
  libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  pkg-config

# Node.js via NodeSource
if ! command -v node &>/dev/null || [ "$(node -p "process.versions.node.split('.')[0]")" -lt "$NODE_MAJOR" ] 2>/dev/null; then
  log "Instalando Node.js ${NODE_MAJOR}.x..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt_install install -y nodejs
else
  log "Node.js $(node -v) já instalado."
fi

# Infraestrutura (MariaDB, Redis, Elasticsearch, Krill) — reutiliza setup-local.sh
log "Instalando MariaDB, Redis, Elasticsearch e Krill..."
bash "$SCRIPT_DIR/setup-local.sh"

# Nginx
if [[ "$INSTALL_NGINX" != "n" && "$INSTALL_NGINX" != "nao" && "$INSTALL_NGINX" != "não" ]]; then
  log "Instalando Nginx..."
  apt_install install -y nginx

  NGINX_SITE="/etc/nginx/sites-available/ispconsultor"
  cat > "$NGINX_SITE" <<EOF
upstream ispconsultor_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/ispconsultor-access.log;
    error_log /var/log/nginx/ispconsultor-error.log;

    client_max_body_size 50M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location = /config.js {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
    }

    location /webhook {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location /boleto {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /arquivos {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location ~ ^/(health|client-ip) {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ispconsultor-agent {
        proxy_pass http://ispconsultor_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/ispconsultor
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
fi

# ---------------------------------------------------------------------------
# Aplicação (como usuário da app)
# ---------------------------------------------------------------------------

log "Instalando dependências npm..."
run_as_app_user "npm install --no-audit --no-fund"
run_as_app_user "npm install --prefix backend --no-audit --no-fund"
run_as_app_user "npm install --prefix frontend --no-audit --no-fund"

mkdir -p "$PROJECT_ROOT/logs"
chown -R "$RUN_USER:$RUN_USER" "$PROJECT_ROOT/logs"

log "Build do backend..."
run_as_app_user "npm run build --prefix backend"

log "Build do frontend (pode levar alguns minutos)..."
run_as_app_user "npm run build --prefix frontend"

if [ ! -f "$PROJECT_ROOT/frontend/build/index.html" ]; then
  die "Build do frontend falhou — frontend/build/index.html não encontrado."
fi

log "Executando migrations..."
run_as_app_user "npm run migrate --prefix backend"

log "Configurando PM2..."
run_as_app_user "npm run pm2:delete 2>/dev/null || true"
run_as_app_user "npm run prod:pm2"
run_as_app_user "npx pm2 save"

PM2_STARTUP="$(run_as_app_user "npx pm2 startup systemd -u $RUN_USER --hp $(eval echo ~$RUN_USER)" 2>&1 | grep -E '^sudo env' || true)"
if [ -n "$PM2_STARTUP" ]; then
  log "Registrando PM2 no boot..."
  eval "$PM2_STARTUP"
fi

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------

echo ""
echo "=== Instalação concluída ==="
echo ""
echo "URL configurada:     $BASE_URL"
echo "Backend (.env):      $ENV_FILE"
echo "Banco:               $DB_NAME @ localhost (usuário: $DB_USER)"
echo ""
echo "PM2:"
run_as_app_user "npx pm2 list" || true
echo ""
echo "Acesso inicial:"
echo "  E-mail: admin@ispconsultor.com.br"
echo "  Senha:  admin123  (troque no primeiro login)"
echo ""
if [[ "$INSTALL_NGINX" != "n" && "$INSTALL_NGINX" != "nao" && "$INSTALL_NGINX" != "não" ]]; then
  echo "Nginx: proxy em ${BASE_URL} → frontend :3000, API → backend :3001"
else
  echo "Sem Nginx: frontend em http://localhost:3000 | backend em http://localhost:3001"
fi
echo ""
echo "Comandos úteis (como $RUN_USER):"
echo "  cd $PROJECT_ROOT && npx pm2 logs"
echo "  cd $PROJECT_ROOT && npm run prod:pm2:stop"
echo "  cd $PROJECT_ROOT/backend && npm run migrate"
echo ""
