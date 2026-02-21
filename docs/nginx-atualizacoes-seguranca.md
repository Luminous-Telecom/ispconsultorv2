# Atualizações de Segurança no Nginx — BackNet

**Data:** Fevereiro 2026  
**Contexto:** Aplicadas correções de segurança no Express/Helmet. Algumas dessas correções exigem ajustes no Nginx para evitar conflitos ou para completar a proteção.

---

## Status atual dos arquivos

| Arquivo | Situação |
|---|---|
| `/etc/nginx/sites-available/default` | Já atualizado (X-Frame-Options e X-Content-Type-Options removidos) |
| `/etc/nginx/sites-available/lumisuite` | Já atualizado (mesmas remoções) |

Os arquivos Nginx foram editados diretamente no servidor. As mudanças **não estão no repositório Git** (estão fora do diretório do projeto). Se você usa outro servidor ou faz redeploy, aplique as mudanças abaixo manualmente.

---

## Mudanças já feitas (aplicadas e Nginx recarregado)

### 1. Remover `X-Frame-Options` e `X-Content-Type-Options` duplicados

**Por quê:** O Express/Helmet já envia esses headers com os valores corretos (`DENY` e `nosniff`). O Nginx tinha `add_header ... always`, que **adiciona** o header à resposta mesmo quando ela já vem com um valor diferente do backend — gerando dois valores conflitantes para o mesmo header.

**Resultado do conflito:**
```
x-frame-options: DENY        ← vindo do Express/Helmet
x-frame-options: SAMEORIGIN  ← sendo adicionado pelo Nginx
```
Alguns browsers usam o mais permissivo (`SAMEORIGIN`), anulando a proteção.

**O que foi removido de ambos os arquivos:**
```nginx
# ANTES (removido):
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
```

**O que ficou (apenas em `lumisuite`):**
```nginx
# MANTIDO — não é duplicado com o Express:
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## Melhorias pendentes (ainda não aplicadas)

As mudanças abaixo são **recomendadas** mas não foram aplicadas automaticamente por exigirem testes e decisão.

---

### 2. Habilitar HTTPS com redirecionamento HTTP → HTTPS

O arquivo `lumisuite` já tem a estrutura comentada para SSL. Em produção, **toda comunicação deve ser HTTPS** para que o cookie `auth_token` (marcado como `Secure`) funcione corretamente.

**No arquivo `/etc/nginx/sites-available/lumisuite`:**

```nginx
# Bloco de redirecionamento — descomente e ajuste o server_name:
server {
    listen 80;
    server_name luminoustelecom.com.br www.luminoustelecom.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    # listen 80;  ← comentar ou remover
    listen 443 ssl http2;
    server_name luminoustelecom.com.br www.luminoustelecom.com.br;

    ssl_certificate     /etc/letsencrypt/live/luminoustelecom.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/luminoustelecom.com.br/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... restante da configuração ...
}
```

> **Importante:** O backend já gera o cookie com `Secure: true` em produção (quando `NODE_ENV=production`). Se o Nginx não usar HTTPS, o browser **não enviará o cookie** e o login vai falhar em produção.

---

### 3. Forçar `proxy_hide_header` para headers duplicados

Como proteção adicional contra headers duplicados vindos de qualquer middleware futuro, adicione em cada `location` que faz proxy para o backend:

```nginx
location /api {
    proxy_pass http://backend;
    # ...headers de proxy existentes...

    # Ocultar headers que o Express já gerencia corretamente
    proxy_hide_header X-Frame-Options;
    proxy_hide_header X-Content-Type-Options;
    proxy_hide_header X-XSS-Protection;
}
```

Isso garante que, mesmo que o Express envie esses headers, o Nginx não os duplique com seus próprios `add_header`. Aplique em todos os `location` que façam `proxy_pass` para o backend: `/api`, `/webhook`, `/boleto`, `/arquivos/`, `/back/`, `/socket.io/`.

---

### 4. Variável de ambiente `ALLOWED_ORIGINS` no backend

O CORS do Express agora usa a variável `ALLOWED_ORIGINS`. Em produção, **configure no `.env` do backend** antes de reiniciar:

```bash
# /home/projetos/BackNet-ERP/backend/.env
ALLOWED_ORIGINS=https://luminoustelecom.com.br,https://www.luminoustelecom.com.br
```

Sem essa variável em produção, o CORS bloqueará todas as origens cross-origin e o frontend não conseguirá fazer requisições à API.

---

### 5. Headers de segurança adicionais para o `index.html`

O arquivo `index.html` do React é servido **diretamente pelo Nginx** (não passa pelo Express). Por isso, os headers de segurança do Helmet **não se aplicam** a ele. Adicione no bloco `location = /index.html`:

```nginx
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;

    # Headers de segurança para o HTML (Helmet não alcança este arquivo)
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # CSP para o HTML principal (equivalente ao que o Express envia para /api)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' https: data:; connect-src 'self' wss: ws:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;" always;
}
```

---

### 6. Remover `X-XSS-Protection` (obsoleto)

O header `X-XSS-Protection` foi **deprecado** pelos principais browsers (Chrome removeu em 2019, Firefox nunca suportou). Em alguns cenários, pode criar vetores de ataque ao invés de proteger. A recomendação atual é usar apenas CSP.

```nginx
# REMOVER ou substituir por:
add_header X-XSS-Protection "0" always;
# O valor "0" desativa o filtro bugado de XSS dos browsers antigos
```

---

## Checklist de aplicação

Execute na ordem abaixo e teste após cada etapa:

```bash
# 1. Editar o arquivo de configuração
sudo nano /etc/nginx/sites-available/default
# (ou lumisuite, conforme o ambiente)

# 2. Testar sintaxe antes de aplicar
sudo nginx -t

# 3. Aplicar se sem erros
sudo nginx -s reload

# 4. Verificar headers da resposta
curl -I https://luminoustelecom.com.br/
# Confirmar: apenas UM x-frame-options: DENY
```

---

## Verificação dos headers atuais

Para verificar o estado atual dos headers em produção:

```bash
# Via curl (verificar duplicatas)
curl -sI https://luminoustelecom.com.br/ | grep -i "x-frame\|x-content\|content-security"

# Via curl para a API
curl -sI https://luminoustelecom.com.br/api/health | grep -i "x-frame\|x-content\|content-security"
```

**Resultado esperado após todas as correções:**
```
x-frame-options: DENY           ← apenas um, vindo do Express
x-content-type-options: nosniff ← apenas um, vindo do Express
content-security-policy: ...    ← vindo do Express (para /api)
                                   ou do Nginx (para index.html)
```
