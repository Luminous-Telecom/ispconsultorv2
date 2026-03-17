#!/bin/bash
# Instala MariaDB, Redis e Elasticsearch no sistema (Debian/Ubuntu).
# Execute com: sudo ./scripts/setup-local.sh

set -e

DB_NAME="${DB_NAME:-backnet}"
DB_USER="${DB_USER:-backnet}"
DB_PASSWORD="${DB_PASSWORD:-}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

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

echo ">>> Criando banco e usuário no MariaDB..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if [ -n "$DB_PASSWORD" ]; then
  sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD'; GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || \
  sudo mysql -e "GRANT ALL ON $DB_NAME.* TO '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD'; FLUSH PRIVILEGES;"
else
  echo "Aviso: DB_PASSWORD vazio. Crie o usuário manualmente:"
  echo "  sudo mysql -e \"CREATE USER 'backnet'@'localhost' IDENTIFIED BY 'sua_senha'; GRANT ALL ON backnet.* TO 'backnet'@'localhost'; FLUSH PRIVILEGES;\""
fi

# --- Redis ---
echo ""
echo ">>> Instalando Redis..."
$PKG_INSTALL redis-server

systemctl start redis-server 2>/dev/null || systemctl start redis 2>/dev/null || true
systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true

if [ -n "$REDIS_PASSWORD" ]; then
  echo "Para usar senha no Redis, edite /etc/redis/redis.conf e adicione: requirepass $REDIS_PASSWORD"
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

echo ""
echo "=== Concluído ==="
echo "MariaDB: localhost:3306"
echo "Redis:   localhost:6379"
echo "Elastic: localhost:9200"
echo ""
echo "Configure o backend/.env com DB_NAME, DB_USER, DB_PASSWORD, REDIS_URL e ELASTICSEARCH_NODE."
echo "Depois rode: cd backend && npm run migrate"
