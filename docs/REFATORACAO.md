# Plano de Refatoração BackNet ERP

## Prioridade Alta

- **Validar webhooks Efí**
  - **Arquivo:** `backend/src/middleware/ValidateEfiWebhook.ts`
  - Implementar verificação do `notification_token` ou assinatura fornecida pela Efí (comparação com token armazenado no banco).
  - Rejeitar chamadas não autenticadas (status 401/403) e registrar tentativa inválida com IP.

- ~~**Remover credenciais padrão do banco de dados**~~ ✔
  - **Arquivo:** `backend/src/config/database.ts`
  - Agora todas as variáveis `DB_*` são obrigatórias; faltas geram erro explícito na inicialização.

## Prioridade Média

- **Externalizar URLs de bancos**
  - **Arquivos:** `backend/src/config/bancos/efi.ts`, `backend/src/models/Banco.ts`
  - Substituir URLs hardcoded por variáveis de ambiente (produção e sandbox) respeitando a regra “Nunca URLs em códigos”.
  - Documentar variáveis no `.env.example`.

- **Centralizar cliente HTTP no frontend**
  - **Arquivos:** `frontend/src/services/api.ts`, `frontend/src/services/core/ApiClient.ts`
  - Unificar em um único wrapper de Axios para evitar duplicação de interceptors e manter comportamento consistente.

## Prioridade Baixa

- **Melhorar feedback de erros globais**
  - Avaliar integração entre `ErrorHandler` e notificações para exibir mensagens amigáveis sem redirecionar imediatamente para login.

- **Documentar fluxo de assinatura webhook**
  - Adicionar passo a passo em `docs/` explicando como configurar tokens e testar endpoint `/webhook/efi`.


