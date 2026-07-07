# ISP Consultor Agent

Agente remoto que conecta ao servidor ISP Consultor via WebSocket. Código em `backend/agent/` (fora do `src`).

Permite acesso terminal e proxy SSH aos equipamentos sem expor portas.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ISPCONSULTOR_SERVER` | — | URL do backend (ex: `http://localhost:3001`) |
| `ISPCONSULTOR_TOKEN` | — | Token do agente (gerado no painel) |
| `ISPCONSULTOR_AGENT_CHANNEL` | — | `dev` ou `prod` — usa URL fixa do canal |
| `ISPCONSULTOR_MAX_SHELLS` | 10 | Máx. sessões simultâneas |
| `ISPCONSULTOR_ALLOWED_BASE_PATH` | `/tmp` | Caminhos para file transfer (separados por vírgula) |

## Uso local

1. Gere um agente no painel e copie o token.
2. Execute:

   ```bash
   cd backend/agent
   ISPCONSULTOR_SERVER=http://localhost:3001 ISPCONSULTOR_TOKEN=<seu-token> node index.js
   ```

## Produção (Docker Compose)

Instale via script gerado no painel (aba **Instalar Manual**) ou instalação automática via SSH.

O script instala Docker (se necessário), grava `docker-compose.yml` em `/opt/ispconsultor-agent` e sobe o container com a imagem pública `midia181/ispconsultor-tunnel` (`:dev` ou `:prod`).

```bash
# Verificar status
cd /opt/ispconsultor-agent && docker compose ps

# Logs
docker logs -f ispconsultor-agent
```

Após regenerar o token no painel, execute o comando de instalação novamente no servidor.

Instalação manual (sem script):

```bash
docker run -d --name ispconsultor-agent --restart unless-stopped \
  midia181/ispconsultor-tunnel:prod --token '<token-do-painel>'
```
