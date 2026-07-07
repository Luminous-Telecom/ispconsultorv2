#!/bin/bash
# Instala MariaDB, Redis e Krill no sistema (Debian/Ubuntu).
# Lê backend/.env (ou .env.example) para criar as configurações correspondentes.
# Execute com: sudo ./scripts/setup-local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$PROJECT_ROOT/backend/.env.example"

# Carrega variáveis do .env
DB_NAME="ispconsultor"
DB_USER="ispconsultor"
DB_PASSWORD=""
REDIS_PASSWORD=""
KRILL_API_URL="https://127.0.0.1:3100"
KRILL_API_TOKEN=""
if [ -f "$ENV_FILE" ]; then
  echo ">>> Carregando $ENV_FILE"
  while IFS= read -r line; do
    [[ "$line" =~ ^# ]] && continue
    [[ ! "$line" =~ = ]] && continue
    key="${line%%=*}"
    key="${key% }"
    val="${line#*=}"
    val="${val#\"}"; val="${val%\"}"
    case "$key" in
      DB_NAME)   DB_NAME="$val" ;;
      DB_USER)   DB_USER="$val" ;;
      DB_PASSWORD) DB_PASSWORD="$val" ;;
      REDIS_PASSWORD) REDIS_PASSWORD="$val" ;;
      KRILL_API_URL) KRILL_API_URL="$val" ;;
      KRILL_API_TOKEN) KRILL_API_TOKEN="$val" ;;
    esac
  done < "$ENV_FILE"
fi

export DB_NAME DB_USER DB_PASSWORD REDIS_PASSWORD

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

prompt_if_empty() {
  local var_name="$1" label="$2" min_len="${3:-8}"
  local current_val="${!var_name}"
  if [ -n "$current_val" ] || [ ! -t 0 ]; then
    return
  fi
  prompt_password "$label" "$var_name" "$min_len"
}

echo "=== ISP Consultor: instalação local (MariaDB, Redis, Krill) ==="

if [ -t 0 ]; then
  echo ""
  echo ">>> Credenciais de infraestrutura (preenchidas automaticamente se já existirem no .env)"
  prompt_if_empty DB_PASSWORD "Senha do banco de dados (MariaDB, usuário $DB_USER)" 8
  prompt_if_empty REDIS_PASSWORD "Senha do Redis" 8
  prompt_if_empty KRILL_API_TOKEN "Token de administração do Krill (RPKI)" 16
fi

export DB_NAME DB_USER DB_PASSWORD REDIS_PASSWORD KRILL_API_TOKEN

# Detecta gerenciador de pacotes
if command -v apt-get &>/dev/null; then
  APT_LOCK_WAIT_SECONDS="${APT_LOCK_WAIT_SECONDS:-300}"

  wait_for_apt() {
    local waited=0
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
       || fuser /var/lib/dpkg/lock >/dev/null 2>&1 \
       || fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
      if [ "$waited" -eq 0 ]; then
        echo ">>> Aguardando liberação do apt (outro processo em execução)..."
        ps aux | grep -E '[a]pt-get|[a]pt |[d]pkg' | head -5 || true
      fi
      if [ "$waited" -ge "$APT_LOCK_WAIT_SECONDS" ]; then
        echo "Erro: apt bloqueado há mais de ${APT_LOCK_WAIT_SECONDS}s."
        echo "Verifique o processo ativo: ps aux | grep -E 'apt|dpkg'"
        echo "Quando terminar, execute o script novamente (é idempotente)."
        exit 1
      fi
      sleep 5
      waited=$((waited + 5))
    done
  }

  apt_update() {
    wait_for_apt
    DEBIAN_FRONTEND=noninteractive apt-get update
  }

  apt_install() {
    wait_for_apt
    DEBIAN_FRONTEND=noninteractive apt-get install -y "$@"
  }

  pkg_installed() {
    dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
  }

  # Instala apenas pacotes ausentes; pula apt update/install se todos já existirem.
  apt_install_if_missing() {
    local pkg missing=()
    for pkg in "$@"; do
      if pkg_installed "$pkg"; then
        echo "  $pkg: já instalado"
      else
        missing+=("$pkg")
      fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
      return 0
    fi
    echo ">>> Instalando: ${missing[*]}"
    apt_update
    apt_install "${missing[@]}"
  }
elif command -v dnf &>/dev/null; then
  apt_update() { dnf check-update || true; }
  apt_install() { dnf install -y "$@"; }

  pkg_installed() {
    rpm -q "$1" &>/dev/null
  }

  apt_install_if_missing() {
    local pkg missing=()
    for pkg in "$@"; do
      if pkg_installed "$pkg"; then
        echo "  $pkg: já instalado"
      else
        missing+=("$pkg")
      fi
    done
    if [ ${#missing[@]} -eq 0 ]; then
      return 0
    fi
    echo ">>> Instalando: ${missing[*]}"
    apt_update
    apt_install "${missing[@]}"
  }
else
  echo "Erro: apt ou dnf não encontrado. Instale manualmente."
  exit 1
fi

# --- MariaDB ---
echo ""
echo ">>> MariaDB..."
if pkg_installed mariadb-server || pkg_installed mysql-server; then
  echo "MariaDB já instalado, pulando..."
else
  apt_install_if_missing mariadb-server mariadb-client \
    || apt_install_if_missing mysql-server mysql-client
fi

systemctl start mariadb 2>/dev/null || systemctl start mysql 2>/dev/null || true
systemctl enable mariadb 2>/dev/null || systemctl enable mysql 2>/dev/null || true

echo ">>> Criando banco e usuário no MariaDB (DB_NAME=$DB_NAME, DB_USER=$DB_USER)..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ -n "$DB_PASSWORD" ]; then
  sudo mysql -e "DROP USER IF EXISTS '$DB_USER'@'localhost'; CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD'; GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"
  echo "Usuário criado com a senha definida em DB_PASSWORD do .env"
else
  echo "Aviso: DB_PASSWORD vazio no .env. Defina DB_PASSWORD no backend/.env e rode o script novamente."
  echo "  Ex: DB_PASSWORD=sua_senha no backend/.env"
fi

# --- Redis ---
echo ""
echo ">>> Redis..."
if pkg_installed redis-server; then
  echo "Redis já instalado, pulando..."
else
  apt_install_if_missing redis-server
fi

systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true

REDIS_CONF="/etc/redis/redis.conf"
[ -f "$REDIS_CONF" ] || REDIS_CONF="/etc/redis/redis-server.conf"
if [ -n "$REDIS_PASSWORD" ] && [ -f "$REDIS_CONF" ]; then
  if grep -q "^requirepass " "$REDIS_CONF"; then
    sed -i "s/^requirepass .*/requirepass $REDIS_PASSWORD/" "$REDIS_CONF"
  else
    echo "requirepass $REDIS_PASSWORD" >> "$REDIS_CONF"
  fi
  systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true
  echo "Redis configurado com senha (REDIS_PASSWORD do .env)"
elif [ -z "$REDIS_PASSWORD" ]; then
  # Garante Redis sem senha (compatível com REDIS_URL=redis://localhost:6379)
  if [ -f "$REDIS_CONF" ] && grep -q "^requirepass " "$REDIS_CONF"; then
    sed -i '/^requirepass /d' "$REDIS_CONF"
    systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true
  fi
fi

# --- Krill (motor RPKI) ---
echo ""
echo ">>> Krill (motor RPKI)..."
KRILL_CONF="/etc/krill.conf"
KRILL_PORT="${KRILL_API_URL##*:}"
KRILL_PORT="${KRILL_PORT%%/*}"
KRILL_PORT="${KRILL_PORT:-3100}"
KRILL_URL="https://127.0.0.1:${KRILL_PORT}"

if command -v apt-get &>/dev/null; then
  if pkg_installed krill || command -v krill &>/dev/null; then
    echo "Krill já instalado, pulando..."
  else
    apt_install_if_missing curl ca-certificates gnupg

    DEB_CODENAME="$(lsb_release -cs 2>/dev/null || true)"
    if [ -z "$DEB_CODENAME" ] && [ -f /etc/os-release ]; then
      # shellcheck disable=SC1091
      . /etc/os-release
      DEB_CODENAME="${VERSION_CODENAME:-}"
    fi
    if [ -z "$DEB_CODENAME" ]; then
      echo "Erro: não foi possível detectar o codename Debian (lsb_release / VERSION_CODENAME)."
      exit 1
    fi

    if [ ! -f /usr/share/keyrings/nlnetlabs-archive-keyring.gpg ]; then
      curl -fsSL https://packages.nlnetlabs.nl/aptkey.asc -o /tmp/nlnetlabs.asc
      gpg --no-tty --batch --dearmor < /tmp/nlnetlabs.asc > /usr/share/keyrings/nlnetlabs-archive-keyring.gpg
    fi
    if [ ! -f /etc/apt/sources.list.d/nlnetlabs.list ]; then
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/nlnetlabs-archive-keyring.gpg] https://packages.nlnetlabs.nl/linux/debian ${DEB_CODENAME} main" \
        | tee /etc/apt/sources.list.d/nlnetlabs.list
    fi
    apt_install_if_missing krill
  fi
else
  echo "Aviso: Krill disponível via apt (Debian/Ubuntu). Instale manualmente se usar outro gerenciador."
fi

if command -v krill &>/dev/null; then
  if [ -f "$KRILL_CONF" ] && [ -z "$KRILL_API_TOKEN" ]; then
    EXISTING_TOKEN="$(grep -E '^admin_token' "$KRILL_CONF" | head -1 | sed -E 's/^admin_token *= *"?([^"]+)"?.*/\1/')"
    [ -n "$EXISTING_TOKEN" ] && KRILL_API_TOKEN="$EXISTING_TOKEN"
  fi
  if [ -z "$KRILL_API_TOKEN" ]; then
    if [ -t 0 ]; then
      prompt_password "Token de administração do Krill (RPKI)" KRILL_API_TOKEN 16
    else
      KRILL_API_TOKEN="$(openssl rand -hex 32)"
      echo "Token Krill gerado automaticamente (sem terminal interativo)."
    fi
  fi

  cat > "$KRILL_CONF" <<EOF
log_type = "syslog"
storage_uri = "/var/lib/krill/data/"
admin_token = "${KRILL_API_TOKEN}"
ip = "127.0.0.1"
port = ${KRILL_PORT}
service_uri = "${KRILL_URL}/"
log_level = "info"
EOF

  systemctl enable krill 2>/dev/null || true
  systemctl restart krill 2>/dev/null || systemctl start krill 2>/dev/null || true

  echo "Krill configurado em ${KRILL_URL} (somente localhost)"
else
  echo "Aviso: Krill não instalado. RPKI não funcionará até instalar o serviço."
fi

update_db_env() {
  local env_path="$1"
  [ -f "$env_path" ] || return 0
  [ -z "$DB_PASSWORD" ] && return 0

  if grep -q "^DB_PASSWORD=" "$env_path"; then
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" "$env_path"
  else
    echo "DB_PASSWORD=${DB_PASSWORD}" >> "$env_path"
  fi
}

update_krill_env() {
  local env_path="$1"
  [ -f "$env_path" ] || return 0
  [ -z "$KRILL_API_TOKEN" ] && return 0

  if grep -q "^KRILL_API_URL=" "$env_path"; then
    sed -i "s|^KRILL_API_URL=.*|KRILL_API_URL=${KRILL_URL}|" "$env_path"
  else
    echo "KRILL_API_URL=${KRILL_URL}" >> "$env_path"
  fi
  if grep -q "^KRILL_API_TOKEN=" "$env_path"; then
    sed -i "s|^KRILL_API_TOKEN=.*|KRILL_API_TOKEN=${KRILL_API_TOKEN}|" "$env_path"
  else
    echo "KRILL_API_TOKEN=${KRILL_API_TOKEN}" >> "$env_path"
  fi
}

update_redis_env() {
  local env_path="$1"
  [ -f "$env_path" ] || return 0
  [ -z "$REDIS_PASSWORD" ] && return 0

  if grep -q "^REDIS_URL=" "$env_path"; then
    sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379|" "$env_path"
  else
    echo "REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379" >> "$env_path"
  fi
  if grep -q "^REDIS_PASSWORD=" "$env_path"; then
    sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=${REDIS_PASSWORD}|" "$env_path"
  else
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> "$env_path"
  fi
}

# Cria .env a partir do .env.example se não existir
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  echo ""
  echo ">>> Criando backend/.env a partir do .env.example..."
  cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
  sed -i "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" "$PROJECT_ROOT/backend/.env"
  sed -i "s/^DB_USER=.*/DB_USER=$DB_USER/" "$PROJECT_ROOT/backend/.env"
  [ -n "$DB_PASSWORD" ] && sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$PROJECT_ROOT/backend/.env"
  if [ -n "$REDIS_PASSWORD" ]; then
    sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379|" "$PROJECT_ROOT/backend/.env"
    grep -q "^REDIS_PASSWORD=" "$PROJECT_ROOT/backend/.env" || echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> "$PROJECT_ROOT/backend/.env"
  fi
  [ -n "$SUDO_USER" ] && chown "$SUDO_USER:$SUDO_USER" "$PROJECT_ROOT/backend/.env"
  echo "backend/.env criado. Ajuste JWT_SECRET e outras variáveis conforme necessário."
fi

update_db_env "$PROJECT_ROOT/backend/.env"
update_krill_env "$PROJECT_ROOT/backend/.env"
update_redis_env "$PROJECT_ROOT/backend/.env"

echo ""
echo "=== Concluído ==="
echo "MariaDB: localhost:3306 ($DB_USER / $DB_NAME)"
echo "Redis:   localhost:6379 $([ -n "$REDIS_PASSWORD" ] && echo "(com senha)" || echo "(sem senha)")"
if command -v krill &>/dev/null; then
  echo "Krill:   ${KRILL_URL} (token em backend/.env → KRILL_API_TOKEN)"
else
  echo "Krill:   não instalado"
fi
echo ""
echo "Execute: cd backend && npm run migrate"
