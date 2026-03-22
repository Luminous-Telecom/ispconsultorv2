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

## Docker (teste local)

O container precisa alcançar o host. No Linux:

```bash
docker rm -f backnet-agent 2>/dev/null
docker run -d --name backnet-agent --restart unless-stopped \
  --add-host=host.docker.internal:host-gateway \
  midia181/backnet-tunnel:dev \
  --server http://host.docker.internal:3001 --token <seu-token>
```

No Mac/Windows, `host.docker.internal` já existe — `--add-host` é opcional.

## Produção

Imagem: `midia181/backnet-tunnel:prod` ou `:dev`

```bash
docker run -d --name backnet-agent --restart unless-stopped \
  midia181/backnet-tunnel:prod \
  --token <token-do-painel>
```

O canal (`:dev` / `:prod`) define a URL do servidor automaticamente.
