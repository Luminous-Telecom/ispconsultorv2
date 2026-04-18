# Backnet Agent

Agente que conecta ao servidor Backnet via WebSocket. Permite acesso terminal e proxy SSH aos equipamentos sem expor portas.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `BACKNET_SERVER` | URL do backend (ex: `http://localhost:3001`) |
| `BACKNET_TOKEN` | Token do agente (gerado no painel) |
| `BACKNET_AGENT_CHANNEL` | `dev` ou `prod` — usa URL fixa do canal |
| `BACKNET_MAX_SHELLS` | Máx. sessões simultâneas (padrão: 10) |
| `BACKNET_ALLOWED_BASE_PATH` | Caminhos para file transfer (padrão: `/tmp`) |

## Teste local

1. **Suba o backend** (porta 3001):
   ```bash
   cd backend && npm run dev
   ```

2. **Obtenha um token**: Cadastros → Equipamentos → Aba Agentes → Criar ou Regenerar token

3. **Rode o agent**:
   ```bash
   cd agent
   BACKNET_SERVER=http://localhost:3001 BACKNET_TOKEN=<seu-token> node index.js
   ```

   Ou com argumentos:
   ```bash
   node index.js --server http://localhost:3001 --token <seu-token>
   ```

4. No painel, use o terminal do agente para testar.

## Produção (Node no servidor)

Use `node` com PM2, systemd ou supervisor — sem container obrigatório. Exemplo com PM2 no diretório do agent:

```bash
cd /caminho/do/agent
BACKNET_AGENT_CHANNEL=prod BACKNET_TOKEN='<token-do-painel>' pm2 start index.js --name backnet-agent
pm2 save
```

Ou variáveis `BACKNET_SERVER` + `BACKNET_TOKEN` se não usar canal fixo.

No painel, a aba **Instalar automático (SSH)** ainda pode usar Docker no equipamento remoto, se você optar por esse método (imagem pública do registry).
