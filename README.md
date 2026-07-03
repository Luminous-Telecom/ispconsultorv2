# ISP Consultor

Sistema ERP completo para gestão de clientes, contratos e cobrança com integração direta aos gateways **Asaas** e **Efí (Gerencianet)**. O projeto inclui backend em Node.js/Express, frontend em React e suporte para deploy com Nginx.

---

## Sumário

1. [Arquitetura Geral](#arquitetura-geral)
2. [Principais Funcionalidades](#principais-funcionalidades)
3. [Requisitos](#requisitos)
4. [Instalação](#instalação)
5. [Configuração do Backend](#configuração-do-backend)
6. [Configuração do Frontend](#configuração-do-frontend)
7. [Configuração do Nginx](#configuração-do-nginx)
8. [Build e Deploy](#build-e-deploy)
9. [Automação com PM2](#automação-com-pm2)
10. [Integrações e Webhooks](#integrações-e-webhooks)
11. [Variáveis de Ambiente](#variáveis-de-ambiente)

---

## Arquitetura Geral

- **Backend**: Node.js + Express + Sequelize (MySQL) com serviços específicos por banco emissor (Asaas/Efí). Gera boletos, cancela/liquida cobranças, controla webhooks e agenda rotinas.
- **Frontend**: React + TypeScript (CRA), Bootstrap e React Query. Interface administrativa com cadastros, financeiro e impressão de boletos.
- **Nginx**: Servidor web reverso para servir arquivos estáticos do frontend e fazer proxy das requisições de API para o backend.

---

## Principais Funcionalidades

- Cadastro e gestão de **clientes**, **contratos**, **planos** e **bancos**.
- **Central do Assinante**: portal self-service para clientes consultarem contratos, faturas e boletos (veja `docs/CENTRAL_ASSINANTE.md`).
- **Geração, cancelamento e liquidação** de boletos nos gateways Asaas e Efí.
- Impressão de segunda via com **linha digitável**, **código de barras** e **PIX QR Code**.
- Armazenamento do `nosso_numero`, `charge_id`, `url_boleto` e metadados FEBRABAN.
- **Webhooks automáticos** (Asaas/Efí) com token gerado e salvo no banco.
- Scheduler para geração automática de títulos.
- Logs estruturados e ofuscação dos builds de produção.

---

## Requisitos

- **Node.js** >= 18
- **NPM** >= 9
- **MySQL** 5.7+ ou **MariaDB** 10.3+ (compatível com Sequelize)
- **Nginx** (para produção)
- **PM2** (opcional, para gerenciamento de processos)
- **Git** (para clonar o repositório)
- **Python 3** e **pip3** (para extração de domínios de PDF no Blockdomi)
- **Redis** (para processamento assíncrono da extração de PDF, evita timeout em PDFs grandes)

---

## Instalação das Dependências do Sistema

### 0. Instalar Elasticsearch (Opcional - para sistema de auditoria)

O Elasticsearch é usado para armazenar logs de auditoria do sistema. A instalação deve ser feita manualmente seguindo os passos abaixo:

**1. Instalar dependências:**
```bash
sudo apt update
sudo apt install -y curl wget apt-transport-https ca-certificates gnupg lsb-release
```

**2. Adicionar repositório do Elasticsearch:**
```bash
# Remover chave antiga se existir
sudo rm -f /usr/share/keyrings/elasticsearch-keyring.gpg

# Baixar e instalar chave GPG
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Adicionar repositório
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null
```

**3. Instalar Elasticsearch:**
```bash
sudo apt update
sudo apt install -y elasticsearch
```

**4. Configurar Elasticsearch:**
```bash
# Editar arquivo de configuração
sudo nano /etc/elasticsearch/elasticsearch.yml
```

Adicione ou modifique as seguintes linhas:
```yaml
# Endereço de rede (apenas localhost para segurança)
network.host: 127.0.0.1

# Habilitar segurança (autenticação)
xpack.security.enabled: true

# Desabilitar SSL/TLS (necessário quando segurança está habilitada)
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false

# Desabilitar Machine Learning
xpack.ml.enabled: false
```

**5. Configurar JVM (memória):**
```bash
# Criar arquivo de configuração de heap
sudo mkdir -p /etc/elasticsearch/jvm.options.d
sudo tee /etc/elasticsearch/jvm.options.d/heap.options > /dev/null << 'EOF'
# Configuração de heap do Elasticsearch
# Ajuste conforme a memória disponível do servidor
-Xms512m
-Xmx512m
EOF
```

**6. Iniciar e habilitar Elasticsearch:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch
```

**7. Aguardar Elasticsearch inicializar:**
```bash
# Aguardar alguns segundos para o Elasticsearch iniciar completamente
sleep 10

# Verificar se está respondendo
curl http://localhost:9200
```

**8. Configurar senha do usuário `elastic`:**

O Elasticsearch 8.x vem com segurança habilitada por padrão. É necessário configurar uma senha para o usuário `elastic`.

**Gerar e configurar senha:**
```bash
# Gerar senha aleatória segura (32 caracteres)
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

# Configurar senha usando o utilitário do Elasticsearch
echo "$ELASTICSEARCH_PASSWORD" | sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i -b

# IMPORTANTE: Anotar a senha gerada, você precisará dela para configurar o .env
echo "════════════════════════════════════════"
echo "Senha do Elasticsearch: $ELASTICSEARCH_PASSWORD"
echo "════════════════════════════════════════"
```

**Nota:** Guarde a senha gerada, pois você precisará adicioná-la no arquivo `.env` do backend no próximo passo.

**9. Configurar variáveis no `.env` do backend:**

Adicione as seguintes variáveis no arquivo `backend/.env`:

```env
# Configurações do Elasticsearch (Auditoria)
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_NAME=ispconsultor-auditoria
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=<senha_gerada_acima>
```

**10. Verificar instalação:**
```bash
# Verificar status do serviço
sudo systemctl status elasticsearch

# Testar conexão com autenticação
curl -u elastic:<senha> http://localhost:9200

# Verificar índices
curl -u elastic:<senha> http://localhost:9200/_cat/indices?v
```

**Troubleshooting:**
- Se o Elasticsearch não iniciar, verifique os logs: `sudo journalctl -u elasticsearch -n 50`
- Se houver erro de memória, ajuste `-Xms` e `-Xmx` em `/etc/elasticsearch/jvm.options.d/heap.options`
- Se houver erro de permissões, verifique: `sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch /var/log/elasticsearch`
- Se não conseguir conectar, verifique se `network.host: 127.0.0.1` está configurado corretamente

Para mais detalhes sobre configuração avançada, consulte: `backend/src/services/elasticsearch/README.md`

### 1. Instalar Node.js e NPM

**Ubuntu/Debian:**
```bash
# Instalar Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x ou superior
npm --version   # Deve mostrar 9.x ou superior
```

**CentOS/RHEL:**
```bash
# Instalar Node.js 20.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verificar instalação
node --version
npm --version
```

**Alternativa com NVM (Node Version Manager):**
```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recarregar terminal ou executar:
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node --version
npm --version
```

### 2. Instalar MySQL ou MariaDB

**MySQL (Ubuntu/Debian):**
```bash
# Atualizar pacotes
sudo apt update

# Instalar MySQL Server
sudo apt install mysql-server -y

# Iniciar e habilitar MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar segurança (opcional, mas recomendado)
sudo mysql_secure_installation

# Verificar status
sudo systemctl status mysql
```

**MariaDB (Ubuntu/Debian):**
```bash
# Atualizar pacotes
sudo apt update

# Instalar MariaDB Server
sudo apt install mariadb-server mariadb-client -y

# Iniciar e habilitar MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Configurar segurança
sudo mysql_secure_installation

# Verificar status
sudo systemctl status mariadb
```

**MySQL (CentOS/RHEL):**
```bash
# Instalar MySQL Server
sudo yum install mysql-server -y

# Iniciar e habilitar MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Obter senha temporária
sudo grep 'temporary password' /var/log/mysqld.log

# Configurar segurança
sudo mysql_secure_installation
```

**MariaDB (CentOS/RHEL):**
```bash
# Instalar MariaDB Server
sudo yum install mariadb-server mariadb -y

# Iniciar e habilitar MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Configurar segurança
sudo mysql_secure_installation
```

### 3. Instalar PM2 (Gerenciador de Processos)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 --version

# Configurar PM2 para iniciar no boot do sistema
pm2 startup
# Siga as instruções exibidas pelo comando acima
```

### 4. Instalar Git

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install git -y
```

**CentOS/RHEL:**
```bash
sudo yum install git -y
```

**Verificar instalação:**
```bash
git --version
```

### 5. Instalar Nginx (Para Produção)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

**CentOS/RHEL:**
```bash
sudo yum install nginx -y

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### 6. Instalar Dependências do Puppeteer (Chromium)

O sistema usa Puppeteer para gerar PDFs. É necessário instalar as dependências do Chromium:

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

**CentOS/RHEL:**
```bash
sudo yum install -y \
    alsa-lib \
    atk \
    cups-libs \
    gtk3 \
    ipa-gothic-fonts \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    xorg-x11-fonts-100dpi \
    xorg-x11-fonts-75dpi \
    xorg-x11-utils \
    nss \
    xorg-x11-fonts-Type1 \
    xorg-x11-fonts-misc
```

**Verificar instalação:**
Após instalar as dependências, reinicie o backend e teste a geração de PDF. Se ainda houver erros relacionados a bibliotecas compartilhadas, execute:

```bash
# Verificar se as bibliotecas estão instaladas (Ubuntu/Debian)
ldconfig -p | grep libnss3

# Se necessário, atualizar cache de bibliotecas
sudo ldconfig
```

### 7. Instalar e configurar Redis (extração de PDF assíncrona)

O Redis é usado para controlar o status do processamento de PDFs em background (evita timeout do Cloudflare em arquivos grandes). Sem Redis configurado, a extração de domínios por PDF retorna 503.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server -y

# Iniciar e habilitar
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar
redis-cli ping
# Deve responder: PONG
```

**CentOS/RHEL:**
```bash
sudo yum install redis -y
sudo systemctl start redis
sudo systemctl enable redis
redis-cli ping
```

**Configurar senha (recomendado em produção):**

Edite o arquivo de configuração do Redis:
```bash
# Ubuntu/Debian
sudo nano /etc/redis/redis.conf

# Procure por # requirepass e descomente, definindo uma senha forte:
# requirepass sua-senha-redis
```

Reinicie o Redis:
```bash
sudo systemctl restart redis-server   # Ubuntu/Debian
# ou
sudo systemctl restart redis         # CentOS/RHEL
```

**Variáveis no `.env` do backend:**

No arquivo `backend/.env`, adicione:

```env
# Redis (extração de PDF assíncrona)
REDIS_URL=redis://localhost:6379
# Se o Redis tiver senha (requirepass):
REDIS_PASSWORD=sua-senha-redis
```

Ou inclua a senha na URL:
```env
REDIS_URL=redis://:sua-senha-redis@localhost:6379
```

**Testar conexão com senha:**
```bash
redis-cli
AUTH sua-senha-redis
PING
# Deve responder PONG
```

---

## Instalação do Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/Luminous-Telecom/ISP Consultor.git
cd ISP Consultor
```

### 2. Instalar Dependências

```bash
# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend
cd ../frontend
npm install

# Voltar para a raiz
cd ..
```

### 3. Configurar Banco de Dados

**Acessar MySQL/MariaDB:**
```bash
# Como root
sudo mysql -u root -p

# Ou se tiver senha configurada
mysql -u root -p
```

**Criar banco de dados e usuário:**
```sql
-- Criar banco de dados
CREATE DATABASE ispconsultor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário (substitua 'sua-senha-aqui' por uma senha segura)
CREATE USER 'ispconsultor'@'localhost' IDENTIFIED BY 'sua-senha-aqui';

-- Conceder privilégios
GRANT ALL PRIVILEGES ON ispconsultor.* TO 'ispconsultor'@'localhost';

-- Aplicar alterações
FLUSH PRIVILEGES;

-- Verificar criação
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = 'ispconsultor';

-- Sair do MySQL
EXIT;
```

**Testar conexão:**
```bash
mysql -u ispconsultor -p ispconsultor
# Digite a senha configurada
# Se conectar com sucesso, digite EXIT para sair
```

### 4. Executar Migrations

```bash
cd backend
npm run build
npm run migrate  # Se houver script de migration configurado
# Ou execute as migrations manualmente via Sequelize CLI
```

---

## Configuração do Backend

### 1. Criar Arquivo de Ambiente

```bash
cd backend
cp .env.example .env
```

### 2. Editar `.env` do Backend

```env
# Configurações do Servidor
PORT=3001

# ⚠️ Configuração da API para o frontend (opcional)
# O backend gera /config.js com /api por padrão; REACT_APP_* não é lido atualmente
# Mantido para referência e possíveis extensões futuras
REACT_APP_API_URL=/api

# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ispconsultor
DB_USER=ispconsultor
DB_PASSWORD=sua-senha-aqui
DB_DIALECT=mysql

# Configurações de Autenticação
JWT_SECRET=seu-jwt-secret-aqui
JWT_EXPIRES_IN=24h

# Configurações de Arquivos
UPLOAD_PATH=./arquivos
MAX_FILE_SIZE=5242880

# Configurações de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis (extração de PDF assíncrona - evita timeout em PDFs grandes)
REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=senha   # descomente se o Redis tiver requirepass

# Webhook Secret Interno
INTERNAL_WEBHOOK_SECRET=seu-webhook-secret-aqui
```

### 3. Build do Backend

```bash
cd backend
npm run build
```

Isso irá:
- Transpilar TypeScript para JavaScript em `dist/`
- Copiar templates de `src/templates/` para `dist/templates/`
- Copiar imagens de `images/` para `dist/images/`

**⚠️ Importante sobre detecção de ambiente:**
- O sistema detecta automaticamente se está em produção ou desenvolvimento
- Em **produção**: código compilado está em `dist/` → detecta via `__dirname.includes('dist')`
- Em **desenvolvimento**: código está em `src/` → detecta automaticamente
- O sistema detecta automaticamente - não é necessário configurar variáveis de ambiente

### 4. Executar Backend

**Desenvolvimento:**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

O backend estará disponível em `http://localhost:3001`

---

## Configuração do Frontend

### 1. Criar Arquivo de Ambiente

```bash
cd frontend
cp env.example .env
```

### 2. Editar `.env` do Frontend

⚠️ **IMPORTANTE:** O arquivo `.env` do frontend é usado **APENAS** em desenvolvimento local (`npm run dev`).  
Em produção, as configurações vêm do backend via `window.__APP_CONFIG__` (arquivo `/config.js` gerado dinamicamente).

**Para Desenvolvimento (modo separado):**
```env
PORT=3000
BACKEND_URL=http://localhost:3001
# Use URL completa APENAS em desenvolvimento local
REACT_APP_API_URL=http://localhost:3001/api
```

**Para Produção:**
```env
# ⚠️ NÃO é necessário configurar REACT_APP_API_URL em produção
# O backend gera /config.js com /api por padrão
# O frontend prioriza window.__APP_CONFIG__ quando disponível
PORT=3000
BACKEND_URL=http://localhost:3001
```

**Nota:** Em produção, o backend serve `/config.js` com `REACT_APP_API_URL=/api`.  
O frontend usa fallback `/api` quando `window.__APP_CONFIG__` não está definido.

### 3. Build do Frontend

```bash
cd frontend
npm run build
```

Isso gerará os arquivos estáticos em `frontend/build/`

### 4. Executar Frontend

**Desenvolvimento:**
```bash
npm run dev
```

**Produção (com servidor Express):**
```bash
npm start
```

O frontend estará disponível em `http://localhost:3000`

---

## Configuração do Nginx

### 1. Instalar Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx -y
```

**CentOS/RHEL:**
```bash
sudo yum install nginx -y
```

### 2. Criar Configuração do Site

Crie o arquivo de configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/ispconsultor
```

### 3. Configuração do Nginx

Escolha uma das opções abaixo:

#### Opção A: HTTP Apenas (Mais Simples)

**Configuração Nginx HTTP:**

```nginx
# Upstream para o backend
upstream backend {
    server localhost:3001;
    keepalive 64;
}

# Servidor HTTP
server {
    listen 80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Logs
    access_log /var/log/nginx/ispconsultor-access.log;
    error_log /var/log/nginx/ispconsultor-error.log;

    # Tamanho máximo de upload
    client_max_body_size 10M;

    # Timeout para requisições longas
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy para config.js (configuração dinâmica do frontend)
    location = /config.js {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para API do backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Proxy para webhooks
    location /webhook {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Proxy para boletos
    location /boleto {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para arquivos
    location /arquivos {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para health check e client IP
    location ~ ^/(health|client-ip) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Arquivos estáticos do frontend
    # ⚠️ IMPORTANTE: Ajuste o caminho abaixo conforme seu ambiente!
    # Desenvolvimento: /home/projetos/ISP Consultor/frontend/build
    # Produção: /opt/ispconsultor.prod/frontend/build (ou o caminho onde está seu frontend)
    location / {
        root /opt/ispconsultor.prod/frontend/build;  # ⚠️ AJUSTE ESTE CAMINHO!
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Sem cache para index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

**⚠️ Nota Importante sobre o caminho:**
- O caminho `root` deve apontar para onde o frontend foi buildado em produção
- Se você fez o build localmente e copiou, ajuste para o caminho correto
- Se o frontend está integrado no backend (`backend/dist/frontend`), use: `root /opt/ispconsultor.prod/backend/dist/frontend;`

#### Opção B: HTTPS com SSL (Recomendado para Produção)

**Configuração Completa do Nginx com HTTPS:**

```nginx
# Upstream para o backend
upstream backend {
    server localhost:3001;
    keepalive 64;
}

# Upstream para o frontend (se usar servidor Express separado)
upstream frontend {
    server localhost:3000;
    keepalive 64;
}

# Redirecionamento HTTP para HTTPS (opcional)
server {
    listen 80;
    server_name seu-dominio.com.br www.seu-dominio.com.br;
    
    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS
server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Certificados SSL (ajuste os caminhos)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Logs
    access_log /var/log/nginx/ispconsultor-access.log;
    error_log /var/log/nginx/ispconsultor-error.log;

    # Tamanho máximo de upload
    client_max_body_size 10M;

    # Timeout para requisições longas
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy para config.js (configuração dinâmica do frontend)
    location = /config.js {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para API do backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Proxy para webhooks
    location /webhook {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Proxy para boletos
    location /boleto {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para arquivos
    location /arquivos {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para health check e client IP
    location ~ ^/(health|client-ip) {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Arquivos estáticos do frontend
    # ⚠️ IMPORTANTE: Ajuste o caminho abaixo conforme seu ambiente!
    # Desenvolvimento: /home/projetos/ISP Consultor/frontend/build
    # Produção: /opt/ispconsultor.prod/frontend/build (ou o caminho onde está seu frontend)
    location / {
        root /opt/ispconsultor.prod/frontend/build;  # ⚠️ AJUSTE ESTE CAMINHO!
        try_files $uri $uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Sem cache para index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }
}
```

**⚠️ Nota Importante sobre o caminho:**
- O caminho `root` deve apontar para onde o frontend foi buildado em produção
- Se você fez o build localmente e copiou, ajuste para o caminho correto
- Se o frontend está integrado no backend (`backend/dist/frontend`), use: `root /opt/ispconsultor.prod/backend/dist/frontend;`

### 4. Habilitar Site

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/ispconsultor /etc/nginx/sites-enabled/

# Remover site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

**⚠️ Importante:** 
- Se usar **HTTP apenas**, ajuste o caminho do `root` no bloco `location /` para o caminho correto do seu servidor
- Se usar **HTTPS**, continue para a próxima seção

### 4.1 Socket.IO e rotas Blockdomi no Nginx

Se você usa **logs em tempo real** (modal "Logs real" do Blockdomi) e/ou as **rotas TXT** do Blockdomi (`/domain/version`, `/domain/all`, `/v4/all`, `/v6/all`), adicione os blocos abaixo **dentro** do `server` (HTTP ou HTTPS), antes do `location /` dos arquivos estáticos.

**Socket.IO (WebSocket):**
```nginx
    # Socket.IO – logs em tempo real do Blockdomi
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
```

**Rotas TXT do Blockdomi (acesso controlado por IP no backend):**
```nginx
    location /domain {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /v4 {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /v6 {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

Depois: `sudo nginx -t` e `sudo systemctl reload nginx`.

### 5. Configurar SSL com Let's Encrypt (Apenas para HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Renovação automática (já configurada pelo certbot)
sudo certbot renew --dry-run
```

### 6. Configuração Alternativa (Frontend com Express)

Se preferir usar o servidor Express do frontend em vez de servir arquivos estáticos diretamente pelo Nginx:

```nginx
# No bloco location /, substitua por:
location / {
    proxy_pass http://frontend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

## Build e Deploy

### Build Completo

```bash
# Build do backend
cd backend
npm run build

# Build do frontend
cd ../frontend
npm run build
```

### Dependências Python (extração de PDF)

A funcionalidade de importar lista de domínios a partir de PDF usa um script Python (`pymupdf`). Após deploy ou atualização no servidor, instale as dependências:

```bash
cd backend/dist/scripts
./install-python-deps.sh
# Ou manualmente: pip3 install pymupdf
```

Se Python 3 não estiver instalado:
```bash
sudo apt install -y python3 python3-pip
```

### Estrutura de Deploy

```
/home/projetos/ISP Consultor/
├── backend/
│   ├── dist/              # Código compilado do backend
│   │   └── scripts/       # Scripts Python (extrair-dominios.py)
│   ├── .env               # Variáveis de ambiente
│   └── node_modules/      # Dependências
├── frontend/
│   ├── build/             # Arquivos estáticos do frontend
│   ├── .env               # Variáveis de ambiente
│   └── node_modules/      # Dependências
└── logs/                  # Logs do PM2
```

---

## Automação com PM2

### Instalação do PM2

Se ainda não instalou o PM2, execute:

```bash
sudo npm install -g pm2
```

### Configurar PM2 para iniciar no boot

```bash
# Gerar script de inicialização
pm2 startup

# Siga as instruções exibidas pelo comando acima
# Geralmente será algo como:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u seu-usuario --hp /home/seu-usuario

# Salvar configuração atual do PM2
pm2 save
```

### Configuração do PM2

O projeto já inclui `ecosystem.config.js` na raiz. Com Nginx servindo arquivos estáticos do frontend, apenas o backend precisa do PM2:

```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: './dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        PORT: process.env.PORT || 3001
      },
      log_file: './logs/backend-combined.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'DD/MM/YYYY HH:mm:ss',
      merge_logs: true,
      max_memory_restart: '2G',
      autorestart: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
```

**Nota:** Se preferir servir o frontend via Express em vez do Nginx, adicione um segundo app com `cwd: './frontend'` e `script: 'server.js'`.

### Comandos PM2

```bash
# Iniciar aplicações
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs

# Reiniciar
pm2 restart all
# ou, se usar o nome 'backend': pm2 restart backend

# Parar
pm2 stop all

# Salvar configuração para iniciar no boot
pm2 save
pm2 startup
```

---

## Integrações e Webhooks

### Asaas

- Geração, cancelamento e liquidação de boletos.
- Registro automático de webhooks (com token armazenado em `bancos.webhook_secret`).
- `notificationDisabled` configurado para evitar envios automáticos de e-mail/SMS.
- Fallback local para linha digitável FEBRABAN em ambiente sandbox.

### Efí (Gerencianet)

- Fluxo equivalente para boletos.
- Webhooks validados usando `webhook_secret` salvo no banco.

### Scheduler

- Gera títulos automaticamente a partir dos contratos.
- Persiste `charge_id`, `linha_digitavel`, `codigo_barras`, `qrcode`, `nosso_numero` etc.

### Typebot

- Integração via API existente: consulta cliente por CNPJ, contratos, títulos e criação de cliente.
- Documentação em `docs/TYPEBOT_INTEGRACAO.md`.

### URLs de Webhook

- **Asaas**: `https://seu-dominio.com.br/webhook/asaas`
- **Efí**: `https://seu-dominio.com.br/webhook/efi`

---

## Variáveis de Ambiente

### Backend (.env)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORT` | Porta da API | `3001` |
| `REACT_APP_API_URL` | URL da API para o frontend (opcional; config.js usa `/api` por padrão) | `/api` (relativo) |
| `DB_HOST` | Host do banco de dados | `localhost` |
| `DB_PORT` | Porta do banco de dados | `3306` |
| `DB_NAME` | Nome do banco de dados | `ispconsultor` |
| `DB_USER` | Usuário do banco de dados | `ispconsultor` |
| `DB_PASSWORD` | Senha do banco de dados | `sua-senha` |
| `JWT_SECRET` | Segredo para tokens JWT | `string-aleatoria` |
| `INTERNAL_WEBHOOK_SECRET` | Token fallback para webhooks | `string-aleatoria` |
| `ELASTICSEARCH_NODE` | URL do nó Elasticsearch (opcional) | `http://localhost:9200` |
| `ELASTICSEARCH_INDEX_NAME` | Nome do índice de auditoria | `ispconsultor-auditoria` |
| `ELASTICSEARCH_USERNAME` | Usuário do Elasticsearch (opcional) | `elastic` |
| `ELASTICSEARCH_PASSWORD` | Senha do Elasticsearch (opcional) | `changeme` |
| `ELASTICSEARCH_SSL` | Habilitar SSL/TLS (opcional) | `false` |
| `ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED` | Rejeitar certificados não autorizados (opcional) | `true` |
| `REDIS_URL` | URL do Redis para jobs de extração de PDF (opcional) | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Senha do Redis, se usar `requirepass` (opcional) | `sua-senha` |

**ℹ️ Sobre `REACT_APP_API_URL` no backend:**
- O backend serve `/config.js` com `REACT_APP_API_URL=/api` por padrão
- O frontend usa `window.__APP_CONFIG__` quando disponível; caso contrário, fallback para `/api`

**ℹ️ Sobre detecção de ambiente:**
- O backend detecta automaticamente o ambiente através do `__dirname`
- Em produção (código em `dist/`): usa `dist/templates/` e `dist/images/`
- Em desenvolvimento (código em `src/`): usa `src/templates/` e `images/` na raiz
- O sistema detecta automaticamente - não é necessário configurar variáveis de ambiente

### Frontend (.env)

⚠️ **IMPORTANTE:** O `.env` do frontend é usado **APENAS** em desenvolvimento local (`npm run dev`).  
Em produção, as configurações vêm do backend via `window.__APP_CONFIG__`.

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORT` | Porta do servidor Express | `3000` |
| `BACKEND_URL` | URL do backend para proxy | `http://localhost:3001` |
| `REACT_APP_API_URL` | URL da API (apenas desenvolvimento local) | `http://localhost:3001/api` |

---

## Troubleshooting

### Backend não inicia

- Verifique se o MySQL está rodando: `sudo systemctl status mysql`
- Verifique as variáveis de ambiente no `.env`
- Verifique os logs: `pm2 logs backend`

### Frontend não carrega

- Verifique se o build foi executado: `cd frontend && npm run build`
- Verifique as permissões da pasta `build/`
- Verifique os logs do Nginx: `sudo tail -f /var/log/nginx/ispconsultor-error.log`

### Erro 502 Bad Gateway

- Verifique se o backend está rodando: `pm2 status`
- Verifique se a porta do backend está correta no Nginx
- Verifique os logs do backend: `pm2 logs backend`

### Webhooks não funcionam

- Verifique se a URL do webhook está correta no gateway
- Verifique se o `webhook_secret` está configurado no banco de dados
- Verifique os logs do backend para erros de validação

---

## Padrões Importantes

- **Código**: TypeScript em todo backend/frontend, evitar `any`, interfaces e tipos fortes.
- **Frontend**: Sempre usar Bootstrap, modais com DraggableModal, tabelas com ordenação local.
- **Banco e Webhooks**: `banco.webhook_secret` gerado on-demand e exibido no modal.
- **Logs**: Usar `logger` estruturado, sem `console.log` em produção.
- **Segurança**: Validação de entrada, rate limiting, headers de segurança no Nginx.

---

Para detalhes adicionais consulte a documentação em `docs/` ou os arquivos de serviço específicos (`backend/src/services/bancos/*.ts`).
