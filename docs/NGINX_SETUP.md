# Configuração do Nginx para Frontend Estático

Este guia explica como servir o frontend usando Nginx sem precisar rodar `npm start`.

## Vantagens

- ✅ **Performance**: Nginx é muito mais rápido para servir arquivos estáticos
- ✅ **Sem Node.js no frontend**: Não precisa rodar processo Node.js para o frontend
- ✅ **Menos recursos**: Economia de memória e CPU
- ✅ **SSL/TLS**: Fácil configuração de HTTPS com Let's Encrypt
- ✅ **Cache**: Cache eficiente de arquivos estáticos

## Pré-requisitos

1. Nginx instalado
2. Frontend buildado (`npm run build` no frontend)
3. Backend rodando (Node.js na porta 3001 ou configurada)

## Passo a Passo

### 1. Build do Frontend

```bash
cd frontend
npm run build
```

Isso gera os arquivos estáticos em `frontend/build/`

### 2. Copiar Arquivos para Local Permanente

```bash
# Criar diretório para o frontend
sudo mkdir -p /var/www/backnet-frontend

# Copiar arquivos buildados
sudo cp -r frontend/build/* /var/www/backnet-frontend/

# Ajustar permissões
sudo chown -R www-data:www-data /var/www/backnet-frontend
sudo chmod -R 755 /var/www/backnet-frontend
```

### 3. Configurar Nginx

```bash
# Copiar arquivo de exemplo
sudo cp docs/nginx.conf.example /etc/nginx/sites-available/backnet

# Editar configuração
sudo nano /etc/nginx/sites-available/backnet
```

**Ajustar no arquivo:**
- `server_name`: seu domínio
- `root`: caminho para `/var/www/backnet-frontend` (ou onde copiou os arquivos)
- `proxy_pass`: porta do backend (padrão: `http://localhost:3001`)

### 4. Habilitar Site

```bash
# Criar symlink
sudo ln -s /etc/nginx/sites-available/backnet /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 5. Configurar SSL (Opcional mas Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Certbot atualiza automaticamente o nginx.conf
```

### 6. Variáveis de Ambiente do Backend

Certifique-se de que o backend tem as variáveis corretas no `.env`:

```env
PORT=3001
REACT_APP_API_URL=https://seu-dominio.com/api
# ou http://seu-dominio.com/api se não usar SSL
```

## Como Funciona

1. **Arquivos estáticos** (JS, CSS, imagens): Servidos diretamente pelo Nginx
2. **`/config.js`**: Proxy para o backend que gera dinamicamente
3. **Rotas da API** (`/api/*`): Proxy reverso para o backend
4. **SPA Routing**: Qualquer rota não encontrada serve `index.html`

## Estrutura de Rotas

```
Frontend (Nginx):
├── /                    → index.html (SPA)
├── /login               → index.html (SPA routing)
├── /dashboard           → index.html (SPA routing)
├── /static/js/*.js      → Arquivos JS estáticos
├── /static/css/*.css    → Arquivos CSS estáticos
└── /config.js           → Proxy para backend (dinâmico)

Backend (Node.js):
├── /api/*               → Rotas da API
├── /webhook/*           → Webhooks
├── /boleto/*            → Boletos
└── /health              → Health check
```

## Manutenção

### Atualizar Frontend

```bash
cd frontend
npm run build
sudo cp -r build/* /var/www/backnet-frontend/
sudo systemctl reload nginx
```

### Logs

```bash
# Logs de acesso
sudo tail -f /var/log/nginx/backnet-access.log

# Logs de erro
sudo tail -f /var/log/nginx/backnet-error.log
```

### Reiniciar Nginx

```bash
sudo systemctl restart nginx
# ou
sudo systemctl reload nginx  # Sem desconectar conexões
```

## Troubleshooting

### 404 em rotas do React Router

Verifique se o `try_files` está configurado corretamente:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### `/config.js` não funciona

Verifique se o backend está rodando e acessível:
```bash
curl http://localhost:3001/config.js
```

### CORS errors

Certifique-se de que `REACT_APP_API_URL` no backend aponta para o mesmo domínio do Nginx.

## Comparação: Nginx vs Node.js

| Aspecto | Nginx | Node.js (server.js) |
|---------|-------|---------------------|
| Performance | ⚡ Muito rápido | 🐢 Mais lento |
| Memória | 💚 Baixa (~10MB) | 🟡 Média (~50MB) |
| CPU | 💚 Baixo uso | 🟡 Médio uso |
| SSL | ✅ Fácil (Certbot) | ⚠️ Mais complexo |
| Cache | ✅ Nativo | ⚠️ Manual |
| Configuração | ⚠️ Mais complexa | ✅ Simples |

**Recomendação**: Use Nginx em produção para melhor performance e economia de recursos.

