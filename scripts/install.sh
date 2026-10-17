#!/bin/bash
# ISP Consultor — instalação completa em Linux (Debian/Ubuntu) a partir do zero.
# Instala dependências de sistema, MariaDB, Redis, Krill, Node.js,
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
NGINX_WEB_ROOT="${NGINX_WEB_ROOT:-/var/www/ispconsultor}"

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

has_backend_source() {
  [ -f "$PROJECT_ROOT/backend/src/scripts/build.ts" ]
}

has_frontend_source() {
  [ -f "$PROJECT_ROOT/frontend/package.json" ] && [ -d "$PROJECT_ROOT/frontend/src" ]
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

pkg_installed() {
  dpkg -s "$1" &>/dev/null
}

install_infra() {
  log "Instalando MariaDB..."
  if pkg_installed mariadb-server || pkg_installed mysql-server; then
    log "MariaDB já instalado."
  else
    apt_install install -y mariadb-server mariadb-client \
      || apt_install install -y mysql-server mysql-client
  fi
  systemctl start mariadb 2>/dev/null || systemctl start mysql 2>/dev/null || true
  systemctl enable mariadb 2>/dev/null || systemctl enable mysql 2>/dev/null || true

  configure_mariadb

  log "Instalando Redis..."
  if pkg_installed redis-server; then
    log "Redis já instalado."
  else
    apt_install install -y redis-server
  fi
  systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
  systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true

  local redis_conf="/etc/redis/redis.conf"
  [ -f "$redis_conf" ] || redis_conf="/etc/redis/redis-server.conf"
  if [ -f "$redis_conf" ]; then
    if grep -q "^requirepass " "$redis_conf"; then
      sed -i "s/^requirepass .*/requirepass ${REDIS_PASSWORD}/" "$redis_conf"
    else
      echo "requirepass ${REDIS_PASSWORD}" >> "$redis_conf"
    fi
    systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true
  fi

  log "Instalando Krill..."
  if ! pkg_installed krill && ! command -v krill &>/dev/null; then
    local deb_codename
    deb_codename="$(lsb_release -cs 2>/dev/null || true)"
    if [ -z "$deb_codename" ] && [ -f /etc/os-release ]; then
      # shellcheck disable=SC1091
      . /etc/os-release
      deb_codename="${VERSION_CODENAME:-}"
    fi
    [ -n "$deb_codename" ] || die "Não foi possível detectar o codename Debian."
    if [ ! -f /usr/share/keyrings/nlnetlabs-archive-keyring.gpg ]; then
      curl -fsSL https://packages.nlnetlabs.nl/aptkey.asc -o /tmp/nlnetlabs.asc
      gpg --no-tty --batch --dearmor < /tmp/nlnetlabs.asc > /usr/share/keyrings/nlnetlabs-archive-keyring.gpg
    fi
    if [ ! -f /etc/apt/sources.list.d/nlnetlabs.list ]; then
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/nlnetlabs-archive-keyring.gpg] https://packages.nlnetlabs.nl/linux/debian ${deb_codename} main" \
        > /etc/apt/sources.list.d/nlnetlabs.list
    fi
    apt_install update -y
    apt_install install -y krill
  fi

  if command -v krill &>/dev/null; then
    cat > /etc/krill.conf <<EOF
log_type = "syslog"
storage_uri = "/var/lib/krill/data/"
admin_token = "${KRILL_API_TOKEN}"
ip = "127.0.0.1"
port = 3100
service_uri = "https://127.0.0.1:3100/"
log_level = "info"
EOF
    systemctl enable krill 2>/dev/null || true
    systemctl restart krill 2>/dev/null || systemctl start krill 2>/dev/null || true
  else
    log "Aviso: Krill não instalado. RPKI fica indisponível até o serviço existir."
  fi
}

configure_mariadb() {
  local root_cnf="" plugin auth root_sql db_pass_sql db_user_sql conf

  mysql_root() {
    if [ -n "$root_cnf" ]; then
      mysql --defaults-extra-file="$root_cnf" "$@"
    else
      mysql "$@"
    fi
  }

  write_root_cnf() {
    rm -f "$root_cnf"
    root_cnf="$(mktemp)"
    chmod 600 "$root_cnf"
    printf '[client]\nuser=root\npassword=%s\nprotocol=socket\n' "$MARIADB_ROOT_PASSWORD" > "$root_cnf"
  }

  if mysql -N -e "SELECT 1" &>/dev/null; then
    log "MariaDB aceitou o root local sem senha."
    plugin="$(mysql -N -e "SELECT plugin FROM mysql.user WHERE User='root' AND Host='localhost' LIMIT 1;")"
    auth="$(mysql -N -e "SELECT IF(authentication_string IS NULL OR authentication_string = '', 'vazio', 'ok') FROM mysql.user WHERE User='root' AND Host='localhost' LIMIT 1;")"
    if [ "$plugin" = "unix_socket" ] || [ "$plugin" = "auth_socket" ] || [ "$auth" = "vazio" ]; then
      prompt_password "O root do MariaDB não tem senha. Defina uma" MARIADB_ROOT_PASSWORD 8
      root_sql="${MARIADB_ROOT_PASSWORD//\'/\'\'}"
      mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${root_sql}'; FLUSH PRIVILEGES;"
      write_root_cnf
      mysql_root -N -e "SELECT 1" >/dev/null || die "Não foi possível aplicar a senha do root do MariaDB."
    fi
  else
    prompt_password "Senha do root do MariaDB" MARIADB_ROOT_PASSWORD 1
    write_root_cnf
    mysql_root -N -e "SELECT 1" >/dev/null || die "Não foi possível entrar no MariaDB com a senha do root."
  fi

  log "Restringindo o MariaDB a este servidor..."
  mysql_root -e "DELETE FROM mysql.user WHERE User='';"
  mysql_root -e "DROP DATABASE IF EXISTS test;"
  mysql_root -e "DELETE FROM mysql.db WHERE Db='test' OR Db LIKE 'test\\_%';"
  mysql_root -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost');"
  mysql_root -e "FLUSH PRIVILEGES;"

  for conf in /etc/mysql/mariadb.conf.d/50-server.cnf /etc/mysql/mysql.conf.d/mysqld.cnf; do
    [ -f "$conf" ] || continue
    if grep -qE '^[[:space:]]*#?[[:space:]]*bind-address' "$conf"; then
      sed -i 's/^[[:space:]]*#\{0,1\}[[:space:]]*bind-address.*/bind-address = 127.0.0.1/' "$conf"
    else
      printf '\n[mysqld]\nbind-address = 127.0.0.1\nskip-name-resolve\n' >> "$conf"
    fi
  done
  systemctl restart mariadb 2>/dev/null || systemctl restart mysql
  mysql_root -N -e "SELECT 1" >/dev/null || die "MariaDB não voltou após restringir o acesso à rede."

  db_pass_sql="${DB_PASSWORD//\'/\'\'}"
  db_user_sql="${DB_USER//\'/\'\'}"
  log "Criando banco e usuário da aplicação (somente localhost)..."
  mysql_root -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql_root -e "DROP USER IF EXISTS '${db_user_sql}'@'localhost'; CREATE USER '${db_user_sql}'@'localhost' IDENTIFIED BY '${db_pass_sql}'; GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${db_user_sql}'@'localhost'; FLUSH PRIVILEGES;"

  rm -f "$root_cnf"
  unset MARIADB_ROOT_PASSWORD
}

publish_frontend() {
  local source="$PROJECT_ROOT/frontend/build"
  [ -f "$source/index.html" ] || die "frontend/build/index.html não encontrado."
  mkdir -p "$NGINX_WEB_ROOT"
  if command -v rsync &>/dev/null; then
    rsync -a --delete "$source/" "$NGINX_WEB_ROOT/"
  else
    find "$NGINX_WEB_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "$source/." "$NGINX_WEB_ROOT/"
  fi
  chown -R "$RUN_USER":www-data "$NGINX_WEB_ROOT"
  usermod -aG www-data "$RUN_USER" 2>/dev/null || true
  chmod -R u=rwX,go=rX "$NGINX_WEB_ROOT"
  log "Frontend publicado em $NGINX_WEB_ROOT"
}

write_database_url() {
  local user_enc pass_enc
  user_enc="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$DB_USER")"
  pass_enc="$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$DB_PASSWORD")"
  set_env_var "$ENV_FILE" "DATABASE_URL" "mysql://${user_enc}:${pass_enc}@localhost:3306/${DB_NAME}"
  chown "$RUN_USER:$RUN_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
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
prompt_password "Senha do Redis" REDIS_PASSWORD 8
prompt_password "Token de administração do Krill (RPKI)" KRILL_API_TOKEN 16
prompt_base_url

DOMAIN="${BASE_URL#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="${DOMAIN%%:*}"

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
set_env_var "$ENV_FILE" "REDIS_URL" "redis://:${REDIS_PASSWORD}@localhost:6379"
set_env_var "$ENV_FILE" "REDIS_PASSWORD" "$REDIS_PASSWORD"
set_env_var "$ENV_FILE" "KRILL_API_URL" "https://127.0.0.1:3100"
set_env_var "$ENV_FILE" "KRILL_API_TOKEN" "$KRILL_API_TOKEN"
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
  curl ca-certificates gnupg lsb-release git rsync \
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

install_infra
write_database_url

log "Instalando Nginx (HTTP)..."
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
        root ${NGINX_WEB_ROOT};
        try_files \$uri \$uri/ /index.html;

        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
EOF

  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/ispconsultor
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  nginx -t
  systemctl enable nginx
  systemctl restart nginx

# ---------------------------------------------------------------------------
# Aplicação (como usuário da app)
# ---------------------------------------------------------------------------

log "Instalando dependências npm..."
if [ -f "$PROJECT_ROOT/package.json" ]; then
  run_as_app_user "npm install --no-audit --no-fund"
fi
if [ -f "$PROJECT_ROOT/backend/package.json" ]; then
  run_as_app_user "npm install --prefix backend --no-audit --no-fund"
fi
if has_frontend_source; then
  run_as_app_user "npm install --prefix frontend --no-audit --no-fund"
else
  log "Frontend: sem código-fonte (repo de produção) — pulando npm install do frontend."
fi

mkdir -p "$PROJECT_ROOT/logs"
chown -R "$RUN_USER:$RUN_USER" "$PROJECT_ROOT/logs"

if has_backend_source; then
  log "Build do backend..."
  run_as_app_user "npm run build --prefix backend"
elif [ -f "$PROJECT_ROOT/backend/dist/index.js" ]; then
  log "Backend: usando backend/dist do repositório (sem recompilar)."
else
  die "backend/dist/index.js não encontrado e não há código-fonte para compilar."
fi

if has_frontend_source; then
  log "Build do frontend (pode levar alguns minutos)..."
  run_as_app_user "npm run build --prefix frontend"
elif [ -f "$PROJECT_ROOT/frontend/build/index.html" ]; then
  log "Frontend: usando frontend/build do repositório (sem recompilar)."
else
  die "frontend/build/index.html não encontrado e não há código-fonte para compilar."
fi

if [ ! -f "$PROJECT_ROOT/frontend/build/index.html" ]; then
  die "Build do frontend indisponível — frontend/build/index.html não encontrado."
fi

log "Publicando frontend em ${NGINX_WEB_ROOT}..."
publish_frontend
nginx -t
systemctl reload nginx

log "Aplicando schema e dados iniciais..."
run_as_app_user "cd backend && npx prisma generate && npx prisma db push && node prisma/seed.js"

log "Configurando PM2..."
systemctl disable --now ispconsultor-backend >/dev/null 2>&1 || true
systemctl disable --now ispconsultor-doc >/dev/null 2>&1 || true
rm -f /etc/systemd/system/ispconsultor-backend.service /etc/systemd/system/ispconsultor-doc.service \
  /usr/local/sbin/ispconsultor-restart.sh /etc/sudoers.d/ispconsultor-restart
systemctl daemon-reload >/dev/null 2>&1 || true
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
echo "Banco:               localhost, usuário ${DB_USER} (senha no .env)"
echo "Nginx:               HTTP :80, server_name ${DOMAIN}"
echo ""
echo "PM2:"
run_as_app_user "npx pm2 list" || true
echo ""
echo "Acesso inicial:"
echo "  URL:    ${BASE_URL}"
echo "  E-mail: admin@ispconsultor.com.br"
echo "  Senha:  admin123  (troque no primeiro login)"
echo ""
echo "Comandos úteis (como $RUN_USER):"
echo "  cd $PROJECT_ROOT && npx pm2 logs"
echo "  cd $PROJECT_ROOT && npm run prod:pm2:stop"
echo "  cd $PROJECT_ROOT/backend && npm run migrate"
echo ""
