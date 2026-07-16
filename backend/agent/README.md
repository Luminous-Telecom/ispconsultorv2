# ISP Consultor Agent

Agente remoto que conecta ao servidor ISP Consultor via WebSocket. Código em `backend/agent/` (fora do `src`).

Permite acesso terminal e proxy SSH aos equipamentos sem expor portas.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ISPCONSULTOR_SERVER` / `--server` | — | URL do backend (ex: `https://beta.ispconsultor.com.br`) — **obrigatório** em staging/beta; o script de instalação do painel passa automaticamente |
| `ISPCONSULTOR_TOKEN` | — | Token do agente (gerado no painel) |
| `ISPCONSULTOR_AGENT_CHANNEL` | — | `dev` ou `prod` — fallback de URL só se `--server` não estiver definido |
| `ISPCONSULTOR_MAX_SHELLS` | 10 | Máx. sessões simultâneas |
| `ISPCONSULTOR_ALLOWED_BASE_PATH` | `/tmp` | Caminhos para file transfer (separados por vírgula) |

## Uso local

1. Gere um agente no painel e copie o token.
2. Execute:

   ```bash
   cd backend/agent
   ISPCONSULTOR_SERVER=http://localhost:3001 ISPCONSULTOR_TOKEN=<seu-token> node index.js
   ```

## Produção (Docker Compose, build local)

Instale via script gerado no painel (aba **Instalar Manual**) ou instalação automática via SSH.

O script baixa `index.js`, `package.json` e `Dockerfile` do ISP Consultor (`GET /api/agents/:id/files/*` com header `X-Agent-Token`), monta a imagem **localmente** e sobe o container em `/opt/ispconsultor-agent`.

```bash
# Verificar status
cd /opt/ispconsultor-agent && docker compose ps

# Logs
docker logs -f ispconsultor-agent

# Reinstalar / atualizar (baixa arquivos novos e reconstrói)
curl -fsSL -H "X-Agent-Token: TOKEN" "https://seu-dominio/api/agents/ID/install-script" | sudo bash
```

Após regenerar o token no painel, execute o comando de instalação novamente no servidor.
