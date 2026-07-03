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

## Produção (systemd)

Instale via script gerado no painel (aba Manual) ou serviço automático via SSH.

O script baixa `index.js` e `package.json` do próprio ISP Consultor e configura o serviço `ispconsultor-agent`.

```bash
# Verificar status
sudo systemctl status ispconsultor-agent

# Logs
sudo journalctl -u ispconsultor-agent -f
```

Instalação manual (sem script):

```bash
ISPCONSULTOR_SERVER=https://seu-dominio ISPCONSULTOR_TOKEN='<token-do-painel>' node index.js
```
