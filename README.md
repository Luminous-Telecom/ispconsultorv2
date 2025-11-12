# BackNet ERP

Sistema ERP completo para gestão de clientes, contratos e cobrança com integração direta aos gateways **Asaas** e **Efí (Gerencianet)**. O projeto inclui backend em Node.js/Express, frontend em React e um pacote de distribuição (`release/`) com artefatos compilados e prontos para produção.

---

## Sumário

1. [Arquitetura Geral](#arquitetura-geral)
2. [Principais Funcionalidades](#principais-funcionalidades)
3. [Estrutura do Repositório](#estrutura-do-repositório)
4. [Requisitos](#requisitos)
5. [Ambiente de Desenvolvimento](#ambiente-de-desenvolvimento)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Build e Release](#build-e-release)
8. [Automação com PM2](#automação-com-pm2)
9. [Integrações e Webhooks](#integrações-e-webhooks)
10. [Padrões Importantes](#padrões-importantes)

---

## Arquitetura Geral

- **Backend**: Node.js + Express + Sequelize (MySQL) com serviços específicos por banco emissor (Asaas/Efí). Gera boletos, cancela/liquida cobranças, controla webhooks e agenda rotinas.
- **Frontend**: React + TypeScript (CRA), Bootstrap e React Query. Interface administrativa com cadastros, financeiro e impressão de boletos.
- **Release**: artefatos compilados prontos para deploy (backend `dist/` ofuscado, frontend `build/` estático e scripts de execução).

---

## Principais Funcionalidades

- Cadastro e gestão de **clientes**, **contratos**, **planos** e **bancos**.
- **Geração, cancelamento e liquidação** de boletos nos gateways Asaas e Efí.
- Impressão de segunda via com **linha digitável**, **código de barras** e **PIX QR Code**.
- Armazenamento do `nosso_numero`, `charge_id`, `url_boleto` e metadados FEBRABAN.
- **Webhooks automáticos** (Asaas/Efí) com token gerado e salvo no banco.
- Scheduler para geração automática de títulos.
- Logs estruturados e ofuscação dos builds de produção.

---

## Estrutura do Repositório

```text
backend/              # Código-fonte do backend (TypeScript)
frontend/             # Código-fonte do frontend (React + TS)
release/              # Build compilado pronto para deploy (submódulo Git)
  ├─ backend/dist     # JS ofuscado + templates de boleto
  ├─ frontend/build   # Bundle estático do React
  ├─ ecosystem.config # Configuração PM2 para backend/frontend release
  └─ docs/            # Documentação e envs de exemplo
logs/                 # Saída padrão dos processos (PM2)
ecosystem.config.js   # Config PM2 ambiente de desenvolvimento
package.json          # Dependências raiz (scripts utilitários)
```

---

## Requisitos

- Node.js **>= 18**
- NPM **>= 9**
- MySQL 5.7+ (ou compatível com Sequelize)  
- Redis (opcional, apenas se ativar features que o utilizem)

---

## Ambiente de Desenvolvimento

1. **Instalar dependências**

   ```bash
   npm install              # raiz (instala somente dependências utilitárias)
   cd backend  && npm install
   cd ../frontend && npm install
   ```

2. **Configurar `.env`**

   - `backend/env.example` → copiar para `backend/.env`
   - `frontend/env.example` → copiar para `frontend/.env`

3. **Executar**

   ```bash
   # Backend (porta padrão 3001)
   cd backend
   npm run dev

   # Frontend (porta padrão 3000)
   cd ../frontend
   npm start
   ```

- Também é possível usar PM2 em modo desenvolvimento:

  ```bash
  pm2 start ecosystem.config.js
  pm2 logs
  ```

---

## Variáveis de Ambiente

### Backend (desenvolvimento)

| Variável            | Descrição                                 | Exemplo                      |
|---------------------|-------------------------------------------|------------------------------|
| `PORT`              | Porta da API                              | `3001`                       |
| `FRONTEND_URL`      | Origem permitida no CORS                  | `http://localhost:3000`      |
| `PRODUCTION_URL`    | Origem adicional opcional                 | `https://sistema.dominio`    |
| `BASE_URL`          | URL base da aplicação                     | `http://localhost:3001`      |
| `DB_*`              | Configurações do banco de dados           | `DB_HOST`, `DB_USER`, etc.   |
| `JWT_SECRET`        | Segredo para tokens JWT                   | `string`                     |
| `INTERNAL_WEBHOOK_SECRET` | Token fallback para webhooks internos | `string`                     |

### Frontend (desenvolvimento)

| Variável              | Descrição                        | Exemplo                          |
|-----------------------|----------------------------------|----------------------------------|
| `REACT_APP_API_URL`   | URL base da API                  | `http://localhost:3001/api`      |
| `PORT` (opcional)     | Porta para `npm start`           | `3000`                           |

### Release

- `release/backend/env.example`
- `release/frontend/env.example`

Esses arquivos já estão prontos para copiar e ajustar conforme o ambiente (produção, homologação etc.).

---

## Build e Release

1. **Backend**

   ```bash
   cd backend
   npm run build          # Transpila TS e ofusca dist/
   ```

2. **Frontend**

   ```bash
   cd frontend
   npm run build          # Gera build/ e ofusca main.js
   ```

3. **Copiar para o release** (se necessário manualmente):

   ```bash
   rm -rf release/backend/dist release/frontend/build
   cp -r backend/dist  release/backend/
   cp -r frontend/build release/frontend/
   ```

> O submódulo `release/` já acompanha esses artefatos no repositório `backnet.prod` (GitHub).

---

## Automação com PM2

### Desenvolvimento

```bash
pm2 start ecosystem.config.js
```

### Produção / Release

```bash
cd release
pm2 start ecosystem.config.js
```

- `BackNet-backend-release`: inicia `npm start` dentro de `release/backend` (porta padrão 6001).
- `BackNet-frontend-release`: inicia o servidor estático (`npm start`) em `release/frontend` (porta padrão 7000), com rewrite automático para SPA.
- Logs ficam em `release/logs/` (ignorados pelo Git).

---

## Integrações e Webhooks

- **Asaas**
  - Geração, cancelamento e liquidação de boletos.
  - Registro automático de webhooks (com token armazenado em `bancos.webhook_secret`).
  - `notificationDisabled` configurado para evitar envios automáticos de e-mail/SMS.
  - Fallback local para linha digitável FEBRABAN em ambiente sandbox.

- **Efí (Gerencianet)**
  - Fluxo equivalente para boletos.
  - Webhooks validados usando `webhook_secret` salvo no banco.

- **Scheduler** (`SchedulerService`)
  - Gera títulos automaticamente a partir dos contratos.
  - Persiste `charge_id`, `linha_digitavel`, `codigo_barras`, `qrcode`, `nosso_numero` etc.

---

## Padrões Importantes

- **Código**
  - TypeScript em todo backend/frontend.
  - Evitar `any`; interfaces e tipos fortes.
  - Lidar com erros via `try/catch` e enviar mensagens amigáveis.
  - Sem `console.log` em produção (usar `logger`).

- **Frontend**
  - Sempre usar Bootstrap (componentes e utilitários).
  - Modais com DraggableModal, feedback via NotificationContext.
  - Tabelas com ordenação local (`useSorting`) e DataTable padrão.
  - API Key e Webhook Secret mascarados com botão de copiar.

- **Banco e Webhooks**
  - `banco.webhook_secret` gerado on-demand e exibido no modal.
  - Webhooks Asaas/Efí expostos em `/webhook/asaas` e `/webhook/efi` (POST).
  - `release/frontend/server.js` faz rewrite para `index.html` (SPA fallback).

---

Para detalhes adicionais consulte a documentação em `release/docs/` ou os arquivos de serviço específicos (`backend/src/services/bancos/*.ts`). Em caso de dúvidas ou novas integrações, abra uma issue ou ajuste o README conforme o fluxo evoluir.

