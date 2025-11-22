# Estrutura de Arquivos - BackNet ERP

Este documento define a estrutura padrão de organização de arquivos do projeto BackNet ERP.

## 📋 Índice

1. [Estrutura Geral do Projeto](#estrutura-geral-do-projeto)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Convenções de Organização](#convenções-de-organização)
5. [Padrões de Agrupamento](#padrões-de-agrupamento)

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
// ✅ Correto
import { ClienteListModal, ClienteModal } from '../modals/clientes';

// ❌ Incorreto
import ClienteListModal from '../modals/clientes/ClienteListModal';
import ClienteModal from '../modals/clientes/cliente/ClienteModal';
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
- [ ] Imports estão usando caminhos relativos corretos?
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
3. **Atualizar imports** (usar busca e substituição)
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

**Última atualização:** 2025-01-22
**Versão:** 1.0

