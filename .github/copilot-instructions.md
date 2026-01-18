# BackNet ERP - Instruções para Agentes de IA

## Visão Geral da Arquitetura

BackNet é um **ERP monolítico separado em 3 camadas** com integração a gateways de pagamento (Asaas/Efí):

- **Backend**: Node.js + Express + Sequelize (MySQL), serviços por banco emissor, webhooks, scheduler
- **Frontend**: React 19 + TypeScript + React Query + Bootstrap 5
- **Nginx**: Proxy reverso em produção, serve arquivos estáticos do frontend, roteia requisições para backend

### Fluxo de Dados Crítico

1. **Cliente → Frontend** (React components com React Query)
2. **Frontend → Backend** (Axios via `BaseService` + `ApiClient` unified layer)
3. **Backend → Gateways** (Asaas/Efí para boletos, NFSe para notas)
4. **Webhooks** (Asaas/Efí → Backend `/webhook` routes, com tokens armazenados em BD)
5. **Background Jobs** (PM2 scheduler services, não cron - ver `workers/` directory)

**Padrão de Resposta Padrão**:
```json
{ "success": true, "message": "string", "data": {}, "pagination": {} }
```

## Convenções Críticas do Projeto

### Backend (Node.js/Express)

**Estrutura de Serviços**: Cada entidade segue padrão controller → service → model
```
src/
├── controllers/    # Validação entrada, error handling, status codes
├── services/       # Lógica de negócio (um diretório por domínio)
├── models/         # Sequelize (associations em arquivo separado)
├── routes/         # Express routers
├── middleware/     # Auth, sanitize, CSRF, rate limit, copy protection
```

**Controllers**: Retornam `{ success, message, data }`, usam try/catch, validam com Joi
```typescript
// Controllers sempre validam entrada e retornam padrão
return { success: true, message: "Criado com sucesso", data: novoCliente };
```

**Migrations**: SEMPRE em JavaScript (`.js`), NUNCA TypeScript
- Implemente `up` e `down` para reversão
- Sequalize CLI: `npm run migrate`, `npm run migrate:undo:all`

**Banco de Dados**: Não especifique nome do banco no código - vem de `.env` (`DB_NAME`)
- Sequelize com MySQL 5.7+
- Índices criados em migrations (ver `00000040-create-performance-indexes.js`)
- Relacionamentos em `src/models/associations/`

### Frontend (React 19 + TypeScript)

**State Management**: React Query ÚNICA fonte de verdade para dados servidor
```typescript
// Padrão: useQuery para fetch, useMutation para alterações
const { data, isLoading, refetch } = useQuery(['clientes'], () => ClienteService.list());
queryClient.invalidateQueries(['clientes']); // Após create/update/delete
```

**Serviços de API**: Unified layer `core/BaseService` + `ApiClient`
```typescript
// Exemplo: ClienteService estende BaseService
class ClienteService extends BaseService<Cliente, CreateCliente, UpdateCliente, ClienteFilters> {
  constructor() {
    super(defaultApiClient, '/clientes');
  }
}
```

**Componentes**: Funcionais com hooks, máx 300 linhas, separar lógica complexa em custom hooks
- Props com interface TypeScript: `interface Props { ... }`
- Use `React.FC<Props>` para tipagem
- Custom hooks: prefixo `use` (ex: `usePlanos`, `useClientes`)

**DataTable**: Componente obrigatório, implementar SEMPRE:
- Ordenação LOCAL (não servidor): `sortColumn='id'`, `sortDirection='desc'` por padrão
- Paginação com `limit`, `page`, `pagination` state
- Busca com `onSearch` prop
- Bulk actions com `window.confirm()` para destrutivas
- Mostrar ID na primeira coluna

```typescript
<DataTable
  data={getSortedData()}
  columns={columns}
  isLoading={isLoading}
  pagination={pagination}
  onSort={handleSort}
  onSearch={setSearch}
/>
```

**Validação de Formulários**: Estado `errors` local, mensagens específicas
- Limpe erros quando usuário começar a digitar
- Use `zod` ou `joi` para schema validation

**Notificações**: Via `NotificationContext` (não `alert()`)
```typescript
const { success, error, warning } = useNotificationContext();
```

**Modais**: SEMPRE use `DraggableModal` (exceto Dashboard que é rota `/`)
- Implemente `onClose` e `onSuccess` callbacks
- Limpe formulário ao fechar

### Padrões de Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes | PascalCase.tsx | `ClienteForm.tsx` |
| Services | camelCase.ts | `clienteService.ts` |
| Hooks | camelCase.ts (com prefixo `use`) | `usePlanos.ts` |
| Variáveis | camelCase | `clienteData` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Handlers | `handle` + Ação | `handleSubmit`, `handleDelete` |
| Booleans | `is`/`has`/`should` | `isLoading`, `hasError` |

## Workflows Críticos

### Build & Development

**Backend**:
```bash
npm run dev              # Nodemon + ts-node (hot reload)
npm run build            # Compila para dist/
npm run migrate          # Sequelize migrations
npm run test             # Jest
npm run lint:fix         # ESLint auto-fix
```

**Frontend**:
```bash
npm run dev              # Craco + React (hot reload)
npm run build            # Build otimizado para produção
```

**Docker**:
```bash
docker-compose up       # Start dev (backend + frontend + MySQL)
```

**PM2** (produção): Hot reload automático configurado em `ecosystem.config.js`
- NÃO execute `pm2 restart` manualmente
- NÃO rode `npm run build` em ambiente dev
- NÃO use `pm2 logs` sem razão

### Deployment & Variáveis de Ambiente

**Variáveis Obrigatórias** (`.env`):
- `JWT_SECRET`: Gere string aleatória forte
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL
- `PORT`: Backend (default 3001)
- URLs dos gateways (Asaas/Efí) e webhooks
- Elasticsearch: `ELASTICSEARCH_HOST`, `ELASTICSEARCH_USER`, `ELASTICSEARCH_PASSWORD`

**Nginx**: Arquivo de configuração necessário para produção (serve arquivos estáticos frontend, proxy requisições backend)

## Integrações Externas

### Gateways de Pagamento (Asaas/Efí)

**Webhook Secret**: Gerado e armazenado em campo `webhook_secret` da tabela `bancos`
- Cada banco (Asaas/Efí) tem suas rotas: `/webhook/asaas` vs `/webhook/efi`
- Valide token ao receber webhook

**Operações Críticas**:
- Gerar boleto: cria `charge_id`, `nosso_numero`, `url_boleto`
- Liquidar/cancelar: chama endpoint do gateway
- Metadados FEBRABAN armazenados em `titulos` table

### Elasticsearch (Auditoria)

Opcional, para logs de auditoria estruturados. Tabela `auditoria` armazena todas as alterações com usuário/timestamp.

## O QUE FAZER ✅

- ✅ Use TypeScript com tipagem forte (evite `any`)
- ✅ Use componentes funcionais React com hooks
- ✅ Ordene dados LOCAL em tabelas
- ✅ Implemente migrations em JavaScript
- ✅ Use variáveis de ambiente para configurações
- ✅ Valide entrada em controllers com Joi
- ✅ Teste ANTES de commitar
- ✅ Use try/catch em todas requisições API
- ✅ Implemente custom hooks para lógica reutilizável

## O QUE NÃO FAZER ❌

- ❌ NÃO use `var`, `any`, class components
- ❌ NÃO deixe `console.log` em produção
- ❌ NÃO hardcode URLs (use variáveis de ambiente ou banco)
- ❌ NÃO especifique nome do banco no código
- ❌ NÃO crie migrations em TypeScript
- ❌ NÃO faça queries N+1
- ❌ NÃO commit `.env`, senhas ou dados sensíveis
- ❌ NÃO use jQuery, inline styles, ou class components
- ❌ NÃO force push para main
- ❌ NÃO atualize git config manualmente

## Exemplos de Implementação

### Criar Nova Entidade (Backend)

1. **Migration** (`backend/migrations/XXXXX-create-entidade.js`)
2. **Model** (`backend/src/models/entidade.ts`) com associations
3. **Service** (`backend/src/services/entidade/entidadeService.ts`)
4. **Controller** (`backend/src/controllers/entidade/`) com validação Joi
5. **Routes** (`backend/src/routes/entidadeRoutes.ts`)

### Criar Nova Feature (Frontend)

1. **Service** (`frontend/src/services/entidadeService.ts` estendendo `BaseService`)
2. **Custom Hook** (`frontend/src/hooks/useEntidade.ts`) para React Query
3. **Type** (`frontend/src/types/entidade.ts`)
4. **Componente de Lista** com `DataTable` + ordenação local
5. **Modal** com `DraggableModal` para create/edit

## Debugging & Troubleshooting

- **Backend logs**: Estruturados via Winston logger em `src/utils/logger`
- **Frontend errors**: Via `NotificationContext` + browser console
- **Database**: Use Sequelize CLI para reverter migrations com `npm run migrate:undo`
- **API responses**: Todos seguem padrão `{ success, message, data, pagination }`

## Documentação Adicional

- Backend estrutura: Ver `backend/src/` e migrations em `backend/migrations/`
- Frontend componentes: Ver `frontend/src/components/README.md`
- Services unificados: Ver `frontend/src/services/core/README.md`
- Regras detalhadas: Ver `.cursor/rules/meu-projeto.mdc`
