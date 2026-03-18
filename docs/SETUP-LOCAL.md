# Setup local (sem Docker): MariaDB, Redis, Elasticsearch

Instalação direta no sistema para Debian/Ubuntu.

## Script automático

O script lê `backend/.env` (ou `.env.example` se `.env` não existir) e cria as configurações correspondentes: usuário MySQL, Redis com ou sem senha, etc.

```bash
# 1. Configure backend/.env com DB_PASSWORD (e opcionalmente REDIS_PASSWORD)
# 2. Execute o script
cd /home/lucas/projetos/BackNet-ERP
sudo bash scripts/setup-local.sh
```

Se `backend/.env` não existir, o script cria a partir do `.env.example` e aplica as configurações.

## Instalação manual

### MariaDB

```bash
sudo apt update
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable mariadb && sudo systemctl start mariadb

# Criar banco e usuário (troque 'sua_senha' pela DB_PASSWORD do .env)
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS backnet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'backnet'@'localhost' IDENTIFIED BY 'sua_senha';
  GRANT ALL ON backnet.* TO 'backnet'@'localhost';
  FLUSH PRIVILEGES;
"
```

### Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server && sudo systemctl start redis-server
```

Redis sem senha: `REDIS_URL=redis://localhost:6379` no `.env`  
Com senha: `REDIS_URL=redis://:senha@localhost:6379` e configure em `/etc/redis/redis.conf`.

### Elasticsearch

```bash
sudo apt install -y apt-transport-https wget
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update
sudo apt install -y elasticsearch
```

Dev local: desabilitar segurança (opcional):

```bash
echo "xpack.security.enabled: false" | sudo tee -a /etc/elasticsearch/elasticsearch.yml
```

```bash
sudo systemctl enable elasticsearch && sudo systemctl start elasticsearch
```

### Configurar backend/.env

Exemplo para uso local:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=backnet
DB_USER=backnet
DB_PASSWORD=sua_senha

REDIS_URL=redis://localhost:6379
# ou com senha: REDIS_URL=redis://:senha@localhost:6379

ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=backnet-auditoria
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### Migrations

```bash
cd backend
npm run migrate
```
