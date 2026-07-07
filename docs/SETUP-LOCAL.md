# Setup local (sem Docker): MariaDB, Redis, Krill

Instalação direta no sistema para Debian/Ubuntu.

## Script automático

O script lê `backend/.env` (ou `.env.example` se `.env` não existir) e cria as configurações correspondentes: usuário MySQL, Redis com ou sem senha, Krill (RPKI), etc.

```bash
# 1. Configure backend/.env com DB_PASSWORD (e opcionalmente REDIS_PASSWORD)
# 2. Execute o script
cd /caminho/do/ispconsultor
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
  CREATE DATABASE IF NOT EXISTS ispconsultor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ispconsultor'@'localhost' IDENTIFIED BY 'sua_senha';
  GRANT ALL ON ispconsultor.* TO 'ispconsultor'@'localhost';
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

### Configurar backend/.env

Exemplo para uso local:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ispconsultor
DB_USER=ispconsultor
DB_PASSWORD=sua_senha

REDIS_URL=redis://localhost:6379
# ou com senha: REDIS_URL=redis://:senha@localhost:6379
```

### Migrations

```bash
cd backend
npm run migrate
```
