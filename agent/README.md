# ISP Consultor Agent

Agente que conecta ao servidor ISP Consultor via WebSocket. Permite acesso terminal e proxy SSH aos equipamentos sem expor portas.

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
   ISPCONSULTOR_SERVER=http://localhost:3001 ISPCONSULTOR_TOKEN=<seu-token> node index.js
   ```

## Produção (PM2)

```bash
ISPCONSULTOR_AGENT_CHANNEL=prod ISPCONSULTOR_TOKEN='<token-do-painel>' pm2 start index.js --name ispconsultor-agent
```

Ou variáveis `ISPCONSULTOR_SERVER` + `ISPCONSULTOR_TOKEN` se não usar canal fixo.
