# Estrutura de Arquivos - BackNet ERP

Este documento define a estrutura padrão de organização de arquivos do projeto BackNet ERP.

## 📋 Índice

1. [Estrutura Geral do Projeto](#estrutura-geral-do-projeto)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Path Aliases e Imports](#path-aliases-e-imports)
5. [Rotas e Navegação](#rotas-e-navegação)
6. [Convenções de Organização](#convenções-de-organização)
7. [Padrões de Agrupamento](#padrões-de-agrupamento)
8. [Arquivos de Configuração](#arquivos-de-configuração-importantes)

---

## Estrutura Geral do Projeto

```
BackNet-ERP/
├── backend/              # Aplicação Node.js/Express
│   ├── src/
│   ├── migrations/
│   ├── seeders/
│   └── package.json
├── frontend/             # Aplicação React
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
├── README.md
├── CONVENCOES_NOMENCLATURA.md
└── ESTRUTURA_ARQUIVOS.md
```

---

## Frontend

### Estrutura Padrão

```
frontend/src/
├── App.tsx                    # Componente raiz da aplicação
├── index.tsx                  # Ponto de entrada
├── index.css                  # Estilos globais
│
├── components/                 # Componentes React
│   ├── common/                # Componentes reutilizáveis
│   │   ├── Loading.tsx
│   │   ├── DraggableModal.tsx
│   │   ├── ListModal.tsx
│   │   └── ...
│   ├── layout/                # Componentes de layout
│   │   └── Layout.tsx
│   ├── pages/                 # Páginas principais
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   └── PagamentoPublico.tsx
│   ├── modals/                # Modais organizados por entidade
│   │   ├── clientes/
│   │   │   ├── ClienteListModal.tsx
│   │   │   ├── cliente/
│   │   │   │   ├── ClienteModal.tsx
│   │   │   │   ├── abas/
│   │   │   │   │   ├── DadosBasicosTab.tsx
│   │   │   │   │   ├── EnderecoTab.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── types.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── planos/
│   │   ├── bancos/
│   │   ├── contratos/
│   │   ├── titulos/
│   │   └── parametros/
│   ├── tables/                # Componentes de tabela
│   │   ├── Table.tsx
│   │   ├── TableColumn.tsx
│   │   ├── TableActions.tsx
│   │   ├── TableFilters.tsx
│   │   ├── TablePagination.tsx
│   │   ├── useTable.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── forms/                 # Componentes de formulário
│   │   ├── AddressFields.tsx
│   │   ├── ContactFields.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   ├── ui/                    # Componentes de UI básicos
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── FormField.tsx
│   │   ├── Checkbox.tsx
│   │   ├── EntitySelectField.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   └── notifications/         # Sistema de notificações
│       ├── Notification.tsx
│       ├── NotificationContainer.tsx
│       ├── NotificationProvider.tsx
│       ├── useNotification.ts
│       ├── types.ts
│       └── index.ts
│
├── hooks/                      # Custom hooks
│   ├── useClientes.ts
│   ├── usePlanos.ts
│   ├── useBancos.ts
│   ├── useTitulos.ts
│   ├── useDashboard.ts
│   ├── useClienteForm.ts
│   ├── usePlanoForm.ts
│   ├── useBancoForm.ts
│   ├── useTituloForm.ts
│   ├── useTableFilters.ts
│   ├── useSearch.ts
│   ├── useFilters.ts
│   ├── useSorting.ts
│   ├── usePagination.ts
│   └── index.ts
│
├── services/                   # Serviços de API
│   ├── core/                   # Serviços core
│   │   ├── ApiClient.ts
│   │   ├── BaseService.ts
│   │   ├── ErrorHandler.ts
│   │   ├── ServiceFactory.ts
│   │   ├── ResponseTransformer.ts
│   │   ├── auth.ts
│   │   └── index.ts
│   ├── clienteService.ts
│   ├── planoService.ts
│   ├── bancoService.ts
│   ├── tituloService.ts
│   ├── contratoService.ts
│   ├── authService.ts
│   ├── dashboardService.ts
│   └── ...
│
├── types/                      # Definições de tipos TypeScript
│   ├── entities.ts             # Entidades do domínio
│   ├── api.ts                  # Tipos de API
│   ├── common.ts               # Tipos comuns
│   ├── forms.ts                # Tipos de formulários
│   ├── modal.ts                # Tipos de modais
│   ├── cliente.ts              # Tipos específicos de cliente (legado)
│   └── index.ts                # Re-exportações
│
├── schemas/                    # Schemas de validação (Zod)
│   ├── cliente.schema.ts
│   ├── plano.schema.ts
│   ├── banco.schema.ts
│   ├── titulo.schema.ts
│   ├── contrato.schema.ts
│   ├── receber.schema.ts
│   ├── brazilian-documents.schema.ts
│   └── ...
│
├── utils/                      # Funções utilitárias
│   ├── formatters.ts           # Formatadores (datas, moedas, etc.)
│   ├── validators.ts           # Validadores
│   ├── dateUtils.ts            # Utilitários de data
│   ├── numberUtils.ts          # Utilitários numéricos
│   ├── stringUtils.ts          # Utilitários de string
│   ├── urlUtils.ts             # Utilitários de URL
│   ├── apiErrorHelper.ts       # Helpers de erro de API
│   ├── constants.ts            # Constantes
│   ├── helpers.ts              # Helpers gerais
│   ├── brandLogos.ts           # Logos de marcas
│   ├── modalStack.ts           # Gerenciamento de modais
│   └── index.ts
│
├── contexts/                    # Contextos React
│   ├── ThemeContext.tsx
│   └── DashboardFiltersContext.tsx
│
├── config/                     # Configurações
│   └── api.ts                  # Configuração da API
│
├── constants/                  # Constantes
│   └── ErrorMessages.ts
│
└── styles/                     # Estilos CSS
    ├── themes.css
    ├── protection.css
    ├── custom-select.css
    └── ...
```

### Convenções de Organização

#### Componentes Modais

```
components/modals/{entidade}/
├── {Entidade}ListModal.tsx     # Modal de lista
├── {entidade}/                  # Modal de detalhes/edição
│   ├── {Entidade}Modal.tsx
│   ├── abas/                    # Abas do modal
│   │   ├── {Nome}Tab.tsx
│   │   └── ...
│   ├── modals/                  # Sub-modais (se houver)
│   │   └── ...
│   ├── tipos/                   # Tipos específicos (se necessário)
│   │   └── ...
│   ├── types.ts                 # Tipos do modal
│   └── index.ts                 # Exportações
└── index.ts                     # Exportações principais
```

**Exemplo:**
```
components/modals/clientes/
├── ClienteListModal.tsx
├── cliente/
│   ├── ClienteModal.tsx
│   ├── abas/
│   │   ├── DadosBasicosTab.tsx
│   │   ├── EnderecoTab.tsx
│   │   ├── ContatoTab.tsx
│   │   ├── ContratosTab.tsx
│   │   └── FinanceiroTab.tsx
│   ├── types.ts
│   └── index.ts
└── index.ts
```

#### Hooks

- **Agrupados por funcionalidade**: `useClientes.ts`, `usePlanos.ts`
- **Hooks de formulário**: `use{Entidade}Form.ts` (ex: `useClienteForm.ts`)
- **Hooks de tabela**: `useTableFilters.ts`, `useSearch.ts`, `useSorting.ts`
- **Hooks específicos**: `useDashboard.ts`, `useImpressao.ts`
- **Arquivo `index.ts`**: Re-exporta todos os hooks

#### Services

- **Services core**: Agrupados em `services/core/`
- **Services de entidades**: `{entidade}Service.ts` (ex: `clienteService.ts`)
- **Services específicos**: `{funcionalidade}Service.ts` (ex: `dashboardService.ts`)

#### Types

- **Centralizados em `types/`**: Um arquivo por categoria
- **Re-exportações**: Sempre importar de `types/index.ts`
- **Tipos específicos**: Em `components/modals/{entidade}/{entidade}/types.ts` quando necessário

---

## Backend

### Estrutura Padrão

```
backend/src/
├── index.ts                    # Ponto de entrada
│
├── controllers/                 # Controllers organizados por entidade
│   ├── ClienteController.ts
│   ├── PlanoController.ts
│   ├── BancoController.ts
│   ├── TituloController.ts
│   ├── ContratoController.ts
│   ├── titulos/                # Controllers específicos de títulos
│   │   ├── TituloCRUDController.ts
│   │   ├── TituloPDFController.ts
│   │   ├── TituloBulkController.ts
│   │   └── types.ts
│   ├── DashboardController.ts
│   └── ...
│
├── services/                    # Services organizados por funcionalidade
│   ├── ClienteService.ts
│   ├── PlanoService.ts
│   ├── BancoService.ts
│   ├── TituloService.ts
│   ├── ContratoService.ts
│   ├── VariaveisDocumentoService.ts
│   ├── FinancialCalculationsService.ts
│   ├── PDFGenerationService.ts
│   ├── bancos/                 # Services específicos de bancos
│   │   ├── BancoApiService.ts
│   │   └── ...
│   ├── pdf-generation/         # Services de geração de PDF
│   │   ├── PDFGenerationService.ts
│   │   ├── TemplateLoader.ts
│   │   └── ...
│   ├── variable-handlers/      # Handlers de variáveis de documento
│   │   ├── ClienteVariableHandler.ts
│   │   ├── ContratoVariableHandler.ts
│   │   ├── TituloVariableHandler.ts
│   │   └── ...
│   ├── routines/               # Rotinas agendadas
│   │   ├── VerificarVencimentosRoutine.ts
│   │   ├── EnvioBoletosRoutine.ts
│   │   └── ...
│   ├── webhooks/               # Services de webhooks
│   │   ├── AsaasWebhookService.ts
│   │   ├── EfiWebhookService.ts
│   │   └── ...
│   └── ...
│
├── models/                     # Models Sequelize
│   ├── Cliente.ts
│   ├── Plano.ts
│   ├── Banco.ts
│   ├── Titulo.ts
│   ├── Contrato.ts
│   ├── index.ts                # Re-exportações
│   └── ...
│
├── routes/                     # Definições de rotas
│   ├── cliente.routes.ts
│   ├── plano.routes.ts
│   ├── banco.routes.ts
│   ├── titulo.routes.ts
│   ├── contrato.routes.ts
│   └── index.ts
│
├── middleware/                 # Middlewares
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── csrfMiddleware.ts
│   └── ...
│
├── validators/                 # Validadores (Joi)
│   ├── cliente.validator.ts
│   ├── plano.validator.ts
│   └── ...
│
├── utils/                      # Funções utilitárias
│   ├── logger.ts
│   ├── dateUtils.ts
│   ├── transaction.ts
│   ├── cache.ts
│   ├── metrics.ts
│   └── ...
│
├── types/                      # Tipos TypeScript
│   ├── scheduler.ts
│   └── ...
│
├── interfaces/                 # Interfaces
│   ├── IRoutine.ts
│   └── ...
│
├── config/                     # Configurações
│   ├── database.ts
│   └── ...
│
├── templates/                  # Templates (se houver)
│   └── ...
│
└── workers/                    # Workers (se houver)
    └── ...
```

### Convenções de Organização

#### Controllers

- **Um controller por entidade principal**: `ClienteController.ts`
- **Controllers específicos**: Agrupados em subpastas (ex: `titulos/`)
- **Métodos padrão**: `list`, `getById`, `create`, `update`, `delete`

#### Services

- **Services de entidades**: `{Entidade}Service.ts`
- **Services específicos**: Agrupados em subpastas por funcionalidade
- **Services core**: Em `services/core/` ou na raiz de `services/`

#### Models

- **Um model por tabela**: `Cliente.ts`, `Titulo.ts`
- **Arquivo `index.ts`**: Re-exporta todos os models
- **Associações**: Definidas nos models ou em arquivo separado

---

## Path Aliases e Imports

### Configuração

O projeto usa **path aliases** para simplificar imports e evitar caminhos relativos profundos (`../../../../`).

**Configuração:**
- **TypeScript**: `tsconfig.json` - Define os aliases para o compilador TypeScript
- **Webpack**: `craco.config.js` - Configura o webpack através do CRACO para resolver os aliases em runtime

### Aliases Disponíveis

```typescript
@/*              → src/*
@/components/*   → src/components/*
@/hooks/*        → src/hooks/*
@/services/*     → src/services/*
@/types/*        → src/types/*
@/utils/*        → src/utils/*
@/contexts/*     → src/contexts/*
@/constants/*    → src/constants/*
@/config/*       → src/config/*
@/schemas/*      → src/schemas/*
```

### Convenções de Imports

**✅ Sempre use path aliases para:**
- Hooks: `@/hooks/useClientes`
- Services: `@/services/clienteService`
- Types: `@/types`, `@/types/common`
- Utils: `@/utils/formatters`
- Components: `@/components/ui/FormField`, `@/components/common/DraggableModal`
- Contexts: `@/contexts/ThemeContext`
- Config: `@/config/api`
- Constants: `@/constants/ErrorMessages`
- Schemas: `@/schemas/cliente.schema`

**✅ Use imports relativos apenas para:**
- Componentes próximos na mesma estrutura (ex: `./abas/DadosBasicosTab`)
- Arquivos no mesmo diretório (ex: `./types`)

**❌ Evite:**
- Imports relativos profundos (`../../../../`)
- Imports relativos quando há path alias disponível

### Exemplos

```typescript
// ✅ Correto - Usando path aliases
import { useClientes } from '@/hooks/useClientes';
import { ClienteService } from '@/services/clienteService';
import { Cliente } from '@/types/entities';
import { formatDate } from '@/utils/formatters';
import FormField from '@/components/ui/FormField';
import DraggableModal from '@/components/common/DraggableModal';

// ✅ Correto - Import relativo para componente próximo
import DadosBasicosTab from './abas/DadosBasicosTab';
import { ClienteTabProps } from './types';

// ❌ Incorreto - Import relativo profundo
import { useClientes } from '../../../hooks/useClientes';
import FormField from '../../../../ui/FormField';
```

### CRACO Configuration

O projeto usa **CRACO** (Create React App Configuration Override) para configurar o webpack sem fazer `eject`:

**Arquivo:** `frontend/craco.config.js`
```javascript
const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
```

**Importante:**
- Sempre use `npm run dev` para desenvolvimento (não `react-scripts start`)
- O CRACO é necessário porque o TypeScript entende os aliases, mas o webpack precisa de configuração adicional

---

## Convenções de Organização

### Agrupamento por Funcionalidade

**Regra Principal**: Agrupar arquivos relacionados pela funcionalidade, não pelo tipo.

**✅ Correto:**
```
components/modals/clientes/
├── ClienteListModal.tsx
├── cliente/
│   ├── ClienteModal.tsx
│   ├── types.ts
│   └── hooks/
│       └── useClienteForm.ts
```

**❌ Incorreto:**
```
components/
├── modals/
├── types/
│   └── clienteTypes.ts
└── hooks/
    └── useClienteForm.ts
```

### Arquivos de Índice (index.ts)

**Uso**: Sempre criar `index.ts` para facilitar imports.

**Exemplo:**
```typescript
// components/modals/clientes/index.ts
export { default as ClienteListModal } from './ClienteListModal';
export { default as ClienteModal } from './cliente/ClienteModal';
```

**Import:**
```typescript
// ✅ Correto - Usando path alias
import { ClienteListModal, ClienteModal } from '@/components/modals/clientes';

// ✅ Alternativa - Import relativo para componente próximo
import { ClienteListModal, ClienteModal } from '../modals/clientes';

// ❌ Incorreto - Caminho completo quando há alias disponível
import ClienteListModal from '@/components/modals/clientes/ClienteListModal';
import ClienteModal from '@/components/modals/clientes/cliente/ClienteModal';
```

### Separação de Responsabilidades

- **Componentes**: Apenas lógica de apresentação
- **Hooks**: Lógica de estado e efeitos
- **Services**: Comunicação com API
- **Utils**: Funções puras e utilitárias
- **Types**: Definições de tipos TypeScript

### Níveis de Aninhamento

- **Máximo recomendado**: 3-4 níveis
- **Evitar**: Mais de 5 níveis de profundidade

**Exemplo:**
```
✅ components/modals/clientes/cliente/abas/DadosBasicosTab.tsx (4 níveis)
❌ components/modals/clientes/cliente/abas/tabs/basicos/DadosBasicosTab.tsx (6 níveis)
```

---

## Padrões de Agrupamento

### Por Entidade (Recomendado)

Agrupar todos os arquivos relacionados a uma entidade:

```
clientes/
├── ClienteListModal.tsx
├── ClienteModal.tsx
├── useClientes.ts
├── clienteService.ts
├── cliente.schema.ts
└── types.ts
```

### Por Tipo de Arquivo (Alternativa)

Agrupar por tipo quando há muitos arquivos:

```
components/
├── modals/
├── tables/
└── forms/

hooks/
├── useClientes.ts
├── usePlanos.ts
└── ...

services/
├── clienteService.ts
├── planoService.ts
└── ...
```

### Híbrido (Atual)

O projeto atual usa uma abordagem híbrida:

- **Components**: Agrupados por tipo e entidade
- **Hooks**: Agrupados por tipo
- **Services**: Agrupados por tipo
- **Types**: Centralizados

---

## Checklist de Verificação

Ao criar ou mover arquivos, verifique:

- [ ] Arquivo está na pasta correta segundo a estrutura padrão?
- [ ] Nome do arquivo segue convenções de nomenclatura?
- [ ] Arquivo `index.ts` existe e exporta corretamente?
- [ ] Imports estão usando path aliases (`@/`) quando possível?
- [ ] Não há mais de 4 níveis de aninhamento?
- [ ] Arquivos relacionados estão agrupados?
- [ ] Estrutura está consistente com o resto do projeto?

---

## Migração e Reorganização

### Quando Reorganizar

- Arquivo está em local inconsistente com padrão
- Múltiplos arquivos relacionados estão espalhados
- Estrutura atual dificulta manutenção
- Novo desenvolvedor tem dificuldade para encontrar arquivos

### Processo de Reorganização

1. **Identificar arquivos fora do padrão**
2. **Planejar nova estrutura**
3. **Atualizar imports** (usar path aliases quando possível)
4. **Mover arquivos** (git mv para preservar histórico)
5. **Testar** todas as funcionalidades
6. **Atualizar documentação**

### Comandos Úteis

```bash
# Mover arquivo preservando histórico
git mv arquivo-antigo.ts novo-local/arquivo-novo.ts

# Buscar imports que precisam ser atualizados
grep -r "import.*arquivo-antigo" src/

# Verificar estrutura atual
tree -L 3 src/
```

---

## Rotas e Navegação

### Estrutura de Rotas

O projeto usa **React Router** para gerenciamento de rotas. As rotas são definidas em `App.tsx`:

**Rotas Principais:**
- `/` - Página inicial (Home)
- `/login` - Página de login
- `/pagamento/:id/:token` - Página pública de pagamento
- `/adm` - Área administrativa (com Layout)
  - `/adm` ou `/adm/dashboard` - Dashboard

### Lazy Loading e Code Splitting

O projeto usa **lazy loading** para otimizar o bundle size:

```typescript
// ✅ Correto - Lazy loading de páginas
const Home = lazy(() => import('./components/pages/Home'));
const Dashboard = lazy(() => import('./components/pages/Dashboard'));
const Login = lazy(() => import('./components/pages/Login'));

// ✅ Correto - Lazy loading de modais
const ClienteListModal = lazy(() => 
  import('@/components/modals/clientes').then(m => ({ default: m.ClienteListModal }))
);
```

**Benefícios:**
- Reduz tamanho do bundle inicial
- Carrega componentes apenas quando necessário
- Melhora performance da aplicação

### Modais como Rotas Virtuais

Alguns modais são abertos através de handlers no Layout, simulando rotas virtuais:
- `/clientes` → Abre `ClienteListModal`
- `/planos` → Abre `PlanoListModal`
- `/bancos` → Abre `BancoListModal`
- `/contratos` → Abre `ContratoListModal`
- `/financeiro` → Abre `FinanceiroModal`

---

## Arquivos de Configuração Importantes

### Frontend

- **`tsconfig.json`**: Configuração TypeScript e path aliases
- **`craco.config.js`**: Configuração CRACO para webpack aliases
- **`package.json`**: Dependências e scripts (usa `craco` em vez de `react-scripts`)

### Backend

- **`tsconfig.json`**: Configuração TypeScript
- **`package.json`**: Dependências e scripts

---

---

**Última atualização:** 2025-01-22
**Versão:** 2.1

