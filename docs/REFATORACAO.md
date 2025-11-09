# Plano de Refatoração BackNet ERP

## Prioridade Média

- **Externalizar URLs de bancos**
  - **Arquivos:** `backend/src/config/bancos/efi.ts`, `backend/src/models/Banco.ts`
  - Substituir URLs hardcoded por variáveis de ambiente (produção e sandbox) respeitando a regra "Nunca URLs em códigos".
  - Documentar variáveis no `.env.example`.

- **Centralizar cliente HTTP no frontend**
  - **Arquivos:** `frontend/src/services/api.ts`, `frontend/src/services/core/ApiClient.ts`
  - Unificar em um único wrapper de Axios para evitar duplicação de interceptors e manter comportamento consistente.

## Prioridade Baixa

- **Melhorar feedback de erros globais**
  - Avaliar integração entre `ErrorHandler` e notificações para exibir mensagens amigáveis sem redirecionar imediatamente para login.


