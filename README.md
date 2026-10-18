# ISP Consultor

ERP para provedores de internet: clientes, contratos, cobrança (Asaas/Efí), rede, RPKI e Central do Assinante.

| Camada | Stack |
|--------|--------|
| Backend | Node.js, Express, Prisma, MySQL/MariaDB |
| Frontend | React, TypeScript (CRA/CRACO) |
| Produção | Nginx (estáticos) + PM2 (API) |

---

## Sumário

1. [Requisitos](#requisitos)
2. [Instalação em produção (do zero)](#instalação-em-produção-do-zero)
3. [Instalação para desenvolvimento](#instalação-para-desenvolvimento)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Atualizar o sistema](#atualizar-o-sistema)
6. [HTTPS (Let's Encrypt)](#https-lets-encrypt)
7. [Webhooks](#webhooks)
8. [Comandos úteis](#comandos-úteis)
9. [Problemas comuns](#problemas-comuns)

---

## Requisitos

| Item | Produção | Desenvolvimento |
|------|----------|-----------------|
| SO | Debian / Ubuntu | qualquer com Node |
| Node.js | 24.x (instalado pelo script) | ≥ 18 |
| MariaDB ou MySQL | sim | sim |
| Redis | sim | sim |
| Nginx | sim (script) | não |
| PM2 | sim (script) | opcional |
| Git + acesso SSH ao repositório | sim | sim |
| Python 3 | recomendado (PDF/Blockdomi) | opcional |

O instalador de produção também configura **Krill** (RPKI). Sem Krill, o restante do ERP funciona; RPKI fica indisponível.

---

## Instalação em produção (do zero)

Fluxo oficial em servidor Debian/Ubuntu. O host clona o fonte, compila e publica. Não use login `root` direto — use um usuário com `sudo`.

### Estrutura no servidor

| Caminho | Conteúdo |
|---------|----------|
| `/opt/ispconsultor` | Repositório Git, backend, `.env`, PM2 |
| `/var/www/ispconsultor` | Frontend estático (Nginx) |

### 1. Usuário da aplicação

```bash
sudo adduser ispconsultor
sudo usermod -aG sudo ispconsultor
su - ispconsultor
```

Se o sudo reclamar de hostname:

```bash
echo "127.0.1.1 $(hostname)" | sudo tee -a /etc/hosts
```

### 2. Chave SSH no GitHub

```bash
ssh-keygen -t ed25519 -C "ispconsultor@$(hostname)" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Cadastre a chave pública em **GitHub → Settings → SSH and GPG keys**. O usuário precisa ter acesso a `Luminous-Telecom/ispconsultorv2`.

```bash
ssh -T git@github.com
```

### 3. Clonar o repositório

A pasta de destino deve estar **vazia** (o `.` no final evita subpasta extra):

```bash
sudo mkdir -p /opt/ispconsultor
sudo chown ispconsultor:ispconsultor /opt/ispconsultor
cd /opt/ispconsultor
git clone git@github.com:Luminous-Telecom/ispconsultorv2.git .
```

### 4. Rodar o instalador

```bash
cd /opt/ispconsultor
sudo bash scripts/install.sh
```

O script pergunta:

1. Senha do banco (usuário MariaDB `ispconsultor`)
2. Senha do Redis
3. Token de administração do Krill (mín. 16 caracteres)
4. URL pública (ex.: `https://erp.suaempresa.com.br` ou `http://IP`)

Em seguida ele:

- Instala Node.js 24, MariaDB, Redis, Krill, Nginx e dependências nativas
- Gera `backend/.env` enxuto de produção (sem template/comentários de desenvolvimento)
- Cria o banco e o usuário da aplicação
- Instala npm, faz build do backend e do frontend
- Publica o front em `/var/www/ispconsultor`
- Configura Nginx (HTTP :80) com proxy para API, webhooks, Socket.IO e agente
- Roda `prisma generate`, `db push` e seed
- Sobe a API no PM2 e registra no boot

### 5. Primeiro acesso

| Campo | Valor |
|-------|--------|
| URL | a que você informou no instalador |
| E-mail | `admin@ispconsultor.com.br` |
| Senha | `admin123` (troque no primeiro login) |

HTTPS: veja [HTTPS (Let's Encrypt)](#https-lets-encrypt) após o DNS apontar para o servidor.

---

## Instalação para desenvolvimento

Para trabalhar no código localmente (hot reload). Não use o `install.sh` de produção nesta máquina, a menos que queira o stack completo.

### 1. Clonar e instalar pacotes

```bash
git clone git@github.com:Luminous-Telecom/ispconsultorv2.git
cd ispconsultorv2
npm run install-all
```

### 2. MariaDB

```bash
sudo apt update
sudo apt install -y mariadb-server mariadb-client
sudo systemctl enable --now mariadb

sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS ispconsultor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'ispconsultor'@'localhost' IDENTIFIED BY 'sua_senha';
  GRANT ALL ON ispconsultor.* TO 'ispconsultor'@'localhost';
  FLUSH PRIVILEGES;
"
```

### 3. Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
redis-cli ping   # PONG
```

### 4. Backend `.env`

```bash
cd backend
cp .env.example .env
```

Preencha no mínimo:

```env
PORT=3001
BASE_URL=http://localhost:3001

DB_HOST=localhost
DB_PORT=3306
DB_NAME=ispconsultor
DB_USER=ispconsultor
DB_PASSWORD=sua_senha

JWT_SECRET=gere-uma-string-longa-aleatoria
JWT_EXPIRES_IN=24h

REDIS_URL=redis://localhost:6379

# Obrigatório para SSH Manager / agente (exatamente 32 caracteres)
SSH_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# RPKI (opcional em dev)
# KRILL_API_URL=https://127.0.0.1:3100
# KRILL_API_TOKEN=
```

Gere segredos se preferir:

```bash
openssl rand -base64 48 | tr -d '=/+' | head -c 64   # JWT
openssl rand -base64 32 | head -c 32                   # SSH_ENCRYPTION_KEY
```

### 5. Schema e seed

```bash
cd backend
npx prisma generate
npm run migrate
node prisma/seed.js
```

### 6. Frontend (dev)

O `frontend/env.example` é opcional. Em desenvolvimento o proxy aponta para `localhost:3001` e a API usa caminhos relativos `/api`.

```bash
cd frontend
cp env.example .env   # opcional
```

### 7. Subir em modo dev

Na raiz do repositório:

```bash
npm run dev
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001  
- Login: `admin@ispconsultor.com.br` / `admin123`

Ou em terminais separados:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PORT` | sim | Porta da API (padrão `3001`) |
| `BASE_URL` | sim | URL pública (links, agente) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | sim | MariaDB/MySQL |
| `DATABASE_URL` | gerada pelo install | Prisma; o `install.sh` grava automaticamente |
| `JWT_SECRET` | sim | Assinatura dos tokens |
| `JWT_EXPIRES_IN` | não | Padrão `24h` |
| `REDIS_URL` | sim* | Jobs/filas; com senha: `redis://:senha@localhost:6379` |
| `REDIS_PASSWORD` | se Redis tiver senha | Espelha a senha do Redis |
| `SSH_ENCRYPTION_KEY` | sim para SSH | 32 caracteres (AES-256) |
| `ALLOWED_ORIGINS` | produção | Origens CORS (vírgula). Dev: vazio aceita tudo |
| `KRILL_API_URL` / `KRILL_API_TOKEN` | RPKI | Motor Krill local |
| `GITHUB_REPO` | atualização pelo ERP | Ex.: `Luminous-Telecom/ispconsultorv2` |
| `GITHUB_TOKEN` | atualização (repo privado) | PAT com leitura de releases; sem token o GitHub responde 404 |
| `PDF_EXTRACT_PYTHON` | opcional | Python do venv com `pymupdf` (Debian PEP 668) |

\* Sem Redis, recursos que usam fila (ex.: extração de PDF) falham.

Em produção o backend serve `/config.js` com `REACT_APP_API_URL=/api`. O frontend prioriza `window.__APP_CONFIG__`.

### Frontend (`frontend/.env`)

Usado **somente** em `npm run dev`. Em produção as configs vêm do backend (`/config.js`).

| Variável | Descrição |
|----------|-----------|
| `BROWSER` | `none` evita abrir o navegador no start |
| `PORT` | Porta do CRA (padrão `3000`) |
| `BACKEND_URL` | Proxy se o backend não estiver em `localhost:3001` |

---

## Atualizar o sistema

### Pelo ERP (recomendado em produção)

**Parâmetros → Atualizações do sistema** (exige `GITHUB_TOKEN` configurado). Faz pull, build, publica em `/var/www/ispconsultor` e reinicia o PM2.

### Manualmente

```bash
cd /opt/ispconsultor
git pull
npm install --prefix backend
npm run build --prefix backend
npm install --prefix frontend
npm run build --prefix frontend
# republicar front (mesmo fluxo do install)
sudo rsync -a --delete frontend/build/ /var/www/ispconsultor/
cd backend && npm run migrate
cd .. && npm run prod:pm2
```

---

## HTTPS (Let's Encrypt)

O `install.sh` sobe HTTP na porta 80. Com DNS apontando para o servidor:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d erp.suaempresa.com.br
```

Atualize `BASE_URL` e `ALLOWED_ORIGINS` em `backend/.env` para `https://...` e reinicie:

```bash
cd /opt/ispconsultor
npm run prod:pm2:stop
npm run prod:pm2
```

---

## Webhooks

Cadastre a URL no gateway e o `webhook_secret` no banco emissor do ERP.

| Gateway | URL |
|---------|-----|
| Asaas (ERP) | `https://seu-dominio/webhook/asaas/:bancoId` |
| Efí (ERP) | `https://seu-dominio/webhook/efi/:bancoId` |
| Asaas/Efí (SaaS) | `https://seu-dominio/webhook/{asaas\|efi}/saas` |

Documentação de uso das telas: wiki em `../backnet-docs/doc/`. Setup interno adicional: `../backnet-docs/docs/`.

---

## Comandos úteis

```bash
# Produção (como usuário da app)
cd /opt/ispconsultor
npx pm2 list
npx pm2 logs
npm run prod:pm2
npm run prod:pm2:stop

# Schema
cd backend && npm run migrate

# Nginx
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/ispconsultor-error.log

# Desenvolvimento
npm run dev
```

---

## Problemas comuns

| Sintoma | O que fazer |
|---------|-------------|
| `Execute como usuário normal com sudo` | Não rode o script como login root. Use `su - ispconsultor` e `sudo bash scripts/install.sh` |
| `Permission denied (publickey)` no Git | Cadastre `~/.ssh/id_ed25519.pub` no GitHub com acesso ao repo |
| `env: 'pm2': Arquivo ou diretório inexistente` no boot | O PM2 é local (`node_modules`). Rode: `sudo ln -sfn /opt/ispconsultor/node_modules/.bin/pm2 /usr/local/bin/pm2` e depois `sudo env PATH="/usr/local/bin:/usr/bin:$PATH" /usr/local/bin/pm2 startup systemd -u ispconsultor --hp /home/ispconsultor` (execute o `sudo env ...` que o PM2 imprimir) |
| Nginx não serve o front | Confirme `root` em `/var/www/ispconsultor` e que `frontend/build` foi publicado |
| 502 Bad Gateway | `npx pm2 list` — API deve estar up na porta 3001 |
| Extração de PDF / fila 503 | Redis rodando e `REDIS_URL` correta no `.env` |
| Puppeteer / PDF quebrado | Instale libs do Chromium (o install.sh já traz várias deps nativas; em instalação manual veja dependências do Puppeteer no SO) |
| RPKI indisponível | Krill instalado e `KRILL_API_*` no `.env` |

---

## Documentação relacionada

| Documento | Conteúdo |
|-----------|----------|
| `../backnet-docs/docs/SETUP-LOCAL.md` | Setup local resumido (sem Docker) |
| `../backnet-docs/docs/CENTRAL_ASSINANTE.md` | Portal do assinante |
| `../backnet-docs/docs/BUILD-MOBILE.md` | Build Capacitor |
| `../backnet-docs/doc/` | Wiki pública (consultores) |
| `scripts/install.sh` | Instalador de produção |
| `backend/.env.example` | Template para desenvolvimento local (não usado pelo install.sh) |
