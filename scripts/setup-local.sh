#!/bin/bash
# Instala MariaDB, Redis e Elasticsearch no sistema (Debian/Ubuntu).
# Lê backend/.env (ou .env.example) para criar as configurações correspondentes.
# Execute com: sudo ./scripts/setup-local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$PROJECT_ROOT/backend/.env.example"

# Carrega variáveis do .env
DB_NAME="backnet"
DB_USER="backnet"
DB_PASSWORD=""
REDIS_PASSWORD=""
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
    esac
  done < "$ENV_FILE"
fi

export DB_NAME DB_USER DB_PASSWORD REDIS_PASSWORD

echo "=== BackNet: instalação local (MariaDB, Redis, Elasticsearch) ==="

# Detecta gerenciador de pacotes
if command -v apt-get &>/dev/null; then
  PKG_UPDATE="apt-get update"
  PKG_INSTALL="apt-get install -y"
elif command -v dnf &>/dev/null; then
  PKG_UPDATE="dnf check-update || true"
  PKG_INSTALL="dnf install -y"
else
  echo "Erro: apt ou dnf não encontrado. Instale manualmente."
  exit 1
fi

# --- MariaDB ---
echo ""
echo ">>> Instalando MariaDB..."
$PKG_UPDATE
$PKG_INSTALL mariadb-server mariadb-client || $PKG_INSTALL mysql-server mysql-client

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
echo ">>> Instalando Redis..."
$PKG_INSTALL redis-server

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

# --- Elasticsearch ---
echo ""
echo ">>> Instalando Elasticsearch..."
if ! command -v elasticsearch &>/dev/null; then
  if command -v apt-get &>/dev/null; then
    apt-get install -y apt-transport-https wget
    wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list
    $PKG_UPDATE
    $PKG_INSTALL elasticsearch
  else
    echo "Instale Elasticsearch manualmente: https://www.elastic.co/guide/en/elasticsearch/reference/current/install-elasticsearch.html"
  fi
fi

# Elasticsearch 8.x: desabilitar segurança para dev local
if [ -f /etc/elasticsearch/elasticsearch.yml ]; then
  if ! grep -q "xpack.security.enabled" /etc/elasticsearch/elasticsearch.yml; then
    echo "xpack.security.enabled: false" >> /etc/elasticsearch/elasticsearch.yml
  fi
fi

systemctl start elasticsearch 2>/dev/null || true
systemctl enable elasticsearch 2>/dev/null || true

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

echo ""
echo "=== Concluído ==="
echo "MariaDB: localhost:3306 ($DB_USER / $DB_NAME)"
echo "Redis:   localhost:6379 $([ -n "$REDIS_PASSWORD" ] && echo "(com senha)" || echo "(sem senha)")"
echo "Elastic: localhost:9200 (segurança desabilitada para dev)"
echo ""
echo "Execute: cd backend && npm run migrate"
