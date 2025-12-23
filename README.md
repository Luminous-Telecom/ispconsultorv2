# BackNet ERP

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
ELASTICSEARCH_INDEX_NAME=backnet-auditoria
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

---

## Instalação do Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/Luminous-Telecom/BackNet-ERP.git
cd BackNet-ERP
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
CREATE DATABASE backnet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário (substitua 'sua-senha-aqui' por uma senha segura)
CREATE USER 'backnet'@'localhost' IDENTIFIED BY 'sua-senha-aqui';

-- Conceder privilégios
GRANT ALL PRIVILEGES ON backnet.* TO 'backnet'@'localhost';

-- Aplicar alterações
FLUSH PRIVILEGES;

-- Verificar criação
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = 'backnet';

-- Sair do MySQL
EXIT;
```

**Testar conexão:**
```bash
mysql -u backnet -p backnet
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
cp env.example .env
```

### 2. Editar `.env` do Backend

```env
# Configurações do Servidor
PORT=3001
NODE_ENV=production
BASE_URL=http://localhost:3001

# ⚠️ IMPORTANTE: Configuração da API para o frontend
# Em produção, SEMPRE use URL relativa: /api
# O backend gera /config.js dinamicamente com este valor
# O frontend sempre prioriza window.__APP_CONFIG__ sobre process.env
REACT_APP_API_URL=/api
REACT_APP_API_TIMEOUT=10000
REACT_APP_API_RETRY_ATTEMPTS=3
REACT_APP_API_RETRY_DELAY=1000

# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=backnet
DB_USER=backnet
DB_PASSWORD=sua-senha-aqui
DB_DIALECT=mysql

# Configurações de Autenticação
JWT_SECRET=seu-jwt-secret-aqui
JWT_EXPIRES_IN=24h

# Configurações de Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Configurações de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

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
- Copiar templates e imagens necessárias
- Copiar o build do frontend para `dist/frontend` (se necessário)

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
# O backend gera /config.js automaticamente com REACT_APP_API_URL=/api
# O frontend sempre prioriza window.__APP_CONFIG__ sobre process.env
PORT=3000
BACKEND_URL=http://localhost:3001
```

**Nota:** Em produção, o backend lê `REACT_APP_API_URL=/api` do seu `.env` e gera `/config.js` dinamicamente.  
O frontend buildado não deve ter URLs hardcoded - sempre use `/api` (relativo).

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
sudo nano /etc/nginx/sites-available/backnet
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
    access_log /var/log/nginx/backnet-access.log;
    error_log /var/log/nginx/backnet-error.log;

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

    # Proxy para uploads
    location /uploads {
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
    # Desenvolvimento: /home/projetos/BackNet-ERP/frontend/build
    # Produção: /opt/backnet.prod/frontend/build (ou o caminho onde está seu frontend)
    location / {
        root /opt/backnet.prod/frontend/build;  # ⚠️ AJUSTE ESTE CAMINHO!
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
- Se o frontend está integrado no backend (`backend/dist/frontend`), use: `root /opt/backnet.prod/backend/dist/frontend;`

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
    access_log /var/log/nginx/backnet-access.log;
    error_log /var/log/nginx/backnet-error.log;

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

    # Proxy para uploads
    location /uploads {
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
    # Desenvolvimento: /home/projetos/BackNet-ERP/frontend/build
    # Produção: /opt/backnet.prod/frontend/build (ou o caminho onde está seu frontend)
    location / {
        root /opt/backnet.prod/frontend/build;  # ⚠️ AJUSTE ESTE CAMINHO!
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
- Se o frontend está integrado no backend (`backend/dist/frontend`), use: `root /opt/backnet.prod/backend/dist/frontend;`

### 4. Habilitar Site

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/backnet /etc/nginx/sites-enabled/

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

### Estrutura de Deploy

```
/home/projetos/BackNet-ERP/
├── backend/
│   ├── dist/              # Código compilado do backend
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

Crie ou edite `ecosystem.config.js` na raiz do projeto:

```javascript
module.exports = {
  apps: [
    {
      name: 'BackNet-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'BackNet-frontend',
      cwd: './frontend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
```

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

### URLs de Webhook

- **Asaas**: `https://seu-dominio.com.br/webhook/asaas`
- **Efí**: `https://seu-dominio.com.br/webhook/efi`

---

## Variáveis de Ambiente

### Backend (.env)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PORT` | Porta da API | `3001` |
| `NODE_ENV` | Ambiente de execução | `production` |
| `BASE_URL` | URL base da aplicação | `http://localhost:3001` |
| `REACT_APP_API_URL` | ⚠️ **URL da API para o frontend** (obrigatório em produção) | `/api` (relativo) |
| `DB_HOST` | Host do banco de dados | `localhost` |
| `DB_PORT` | Porta do banco de dados | `3306` |
| `DB_NAME` | Nome do banco de dados | `backnet` |
| `DB_USER` | Usuário do banco de dados | `backnet` |
| `DB_PASSWORD` | Senha do banco de dados | `sua-senha` |
| `JWT_SECRET` | Segredo para tokens JWT | `string-aleatoria` |
| `INTERNAL_WEBHOOK_SECRET` | Token fallback para webhooks | `string-aleatoria` |
| `ELASTICSEARCH_NODE` | URL do nó Elasticsearch (opcional) | `http://localhost:9200` |
| `ELASTICSEARCH_INDEX_NAME` | Nome do índice de auditoria | `backnet-auditoria` |
| `ELASTICSEARCH_USERNAME` | Usuário do Elasticsearch (opcional) | `elastic` |
| `ELASTICSEARCH_PASSWORD` | Senha do Elasticsearch (opcional) | `changeme` |
| `ELASTICSEARCH_SSL` | Habilitar SSL/TLS (opcional) | `false` |
| `ELASTICSEARCH_SSL_REJECT_UNAUTHORIZED` | Rejeitar certificados não autorizados (opcional) | `true` |

**⚠️ Sobre `REACT_APP_API_URL` no backend:**
- Em produção: **SEMPRE** use `/api` (URL relativa)
- O backend gera `/config.js` dinamicamente com este valor
- O frontend sempre prioriza `window.__APP_CONFIG__` sobre `process.env`
- Não faça build do frontend com URLs hardcoded

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
- Verifique os logs: `pm2 logs BackNet-backend`

### Frontend não carrega

- Verifique se o build foi executado: `cd frontend && npm run build`
- Verifique as permissões da pasta `build/`
- Verifique os logs do Nginx: `sudo tail -f /var/log/nginx/backnet-error.log`

### Erro 502 Bad Gateway

- Verifique se o backend está rodando: `pm2 status`
- Verifique se a porta do backend está correta no Nginx
- Verifique os logs do backend: `pm2 logs BackNet-backend`

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

Para detalhes adicionais consulte a documentação em `release/docs/` ou os arquivos de serviço específicos (`backend/src/services/bancos/*.ts`).
