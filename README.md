# BackNet ERP - Sistema ERP para Assessoria Técnica

## 📑 Índice

- [Visão Geral do Projeto](#-visão-geral-do-projeto)
- [Problemas Identificados](#-problemas-identificados)
- [Status Geral da Refatoração](#-status-geral-da-refatoração)
- [Plano de Refatoração por Etapas](#-plano-de-refatoração-por-etapas)
- [Estrutura de Pastas Proposta](#-estrutura-de-pastas-proposta)
- [Checklist de Cada Etapa](#-checklist-de-cada-etapa)
- [Prioridades de Refatoração](#-prioridades-de-refatoração)
- [Como Começar](#-como-começar)
- [Notas Importantes](#-notas-importantes)

---

## 🔄 BackNet - Plano de Refatoração

## 📋 Visão Geral do Projeto Atual

### Estrutura de Pastas Existente
```
BackNet-ERP/
├── backend/                           # API Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/               # Controllers das entidades (23 controllers)
│   │   ├── models/                    # Modelos Sequelize (30+ models)
│   │   ├── routes/                    # Definição de rotas (23+ arquivos)
│   │   ├── services/                  # Lógica de negócio
│   │   │   └── routines/              # Rotinas agendadas
│   │   ├── middleware/                # Middlewares customizados
│   │   ├── utils/                     # Utilitários
│   │   ├── migrations/                # Migrações do banco de dados
│   │   ├── templates/                 # Templates HTML/PDF
│   │   ├── config/                    # Configurações
│   │   ├── interfaces/                # Interfaces TypeScript
│   │   ├── types/                     # Tipos TypeScript
│   │   └── workers/                    # Workers/Jobs
│   ├── config/                        # Configurações do Sequelize
│   ├── migrations/                    # Migrações (raiz)
│   ├── uploads/                       # Arquivos enviados
│   ├── images/                        # Imagens do sistema
│   └── logs/                          # Logs da aplicação
│
├── frontend/                          # React/TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # ✅ Componentes UI base (NOVO)
│   │   │   ├── modals/                # Modais específicos
│   │   │   │   ├── clientes/          # Modais de clientes
│   │   │   │   ├── planos/            # Modais de planos
│   │   │   │   ├── bancos/            # Modais de bancos
│   │   │   │   ├── contratos/         # Modais de contratos
│   │   │   │   ├── titulos/           # Modais de títulos
│   │   │   │   ├── parametros/         # Modais de parâmetros
│   │   │   │   ├── empresa/            # Modais da empresa
│   │   │   │   └── pagamentos/        # Modais de pagamentos
│   │   │   ├── common/                # Componentes reutilizáveis
│   │   │   ├── tables/                # Componentes de tabela
│   │   │   ├── forms/                 # Formulários
│   │   │   ├── layout/                # Layout principal
│   │   │   ├── pages/                 # Páginas da aplicação
│   │   │   └── notifications/         # Sistema de notificações
│   │   ├── hooks/                     # Hooks customizados (20+ hooks)
│   │   ├── services/                  # Serviços de API (20+ services)
│   │   ├── types/                     # Definições TypeScript
│   │   ├── contexts/                  # Contextos React
│   │   ├── utils/                     # Utilitários
│   │   ├── config/                    # Configurações
│   │   └── styles/                    # Estilos globais
│   ├── public/                        # Arquivos estáticos
│   └── build/                         # Build de produção
│
├── ecosystem.config.js                # Configuração PM2
├── package.json                       # Scripts do projeto
└── README.md                          # Documentação
```

### Principais Funcionalidades
- **Gestão de Clientes**: CRUD completo com validações
- **Gestão de Planos**: Planos de internet/telefonia com diferentes tipos
- **Gestão de Bancos**: Integração com gateways de pagamento (EFI, Asaas)
- **Gestão de Contratos**: Contratos entre clientes e planos
- **Gestão de Títulos/Carnês**: Controle financeiro e cobrança
- **Dashboard**: Relatórios e estatísticas
- **Parâmetros do Sistema**: Configurações globais
- **Modelos de Documentos**: Templates para contratos, recibos, cartas

### Stack Tecnológica Utilizada
- **Frontend**: React 19, TypeScript, Bootstrap 5, React Query, Axios
- **Backend**: Node.js, Express, TypeScript, Sequelize, MySQL
- **Ferramentas**: PM2, Nodemon, Jest, ESLint
- **Bibliotecas**: CKEditor, jsPDF, html2canvas, jsbarcode, qrcode

## 🔍 Problemas Identificados

### 1. Código Duplicado
- **Modais**: Padrões repetidos de criação/edição em todos os modais
- **Formulários**: Validações e estruturas similares
- **Tabelas**: Lógica de ordenação e paginação duplicada
- **Hooks**: Padrões similares de CRUD em diferentes entidades
- **Serviços**: Estruturas de API repetidas

### 2. Componentes que Devem ser Reutilizáveis
- **Botões**: ActionButtons usado em vários lugares
- **Modais**: DraggableModal como base, mas lógica específica duplicada
- **Tabelas**: DataTable e ModernTable com funcionalidades similares
- **Formulários**: Campos de input, select, checkbox repetidos
- **Dropdowns**: ImprimirDropdown, DropdownMenu com lógica similar

### 3. Lógica que Deve ser Separada
- **Validações**: Lógica de validação espalhada pelos componentes
- **Formatação**: Formatação de dados duplicada
- **Estados**: Gerenciamento de estado repetido
- **APIs**: Chamadas HTTP com padrões similares
- **Utilitários**: Funções helper espalhadas

## 📊 Status Geral da Refatoração

**Progresso Geral**: 🟡 **7.5% concluído** (1 de 10 etapas parcialmente concluída)

### 📈 Resumo das Etapas

| Etapa | Status | Progresso | Prioridade |
|-------|--------|-----------|------------|
| 1. Componentes UI Base | 🟡 Em Progresso | 75% | ⚡ Alta |
| 2. Sistema de Formulários | ⏳ Aguardando | 0% | ⚡ Alta |
| 3. Sistema de Tabelas | ⏳ Aguardando | 0% | ⚡ Alta |
| 4. Sistema de Modais | ⏳ Aguardando | 0% | ⚡ Alta |
| 5. Hooks Customizados | ⏳ Aguardando | 0% | ⚡ Alta |
| 6. Serviços de API | ⏳ Aguardando | 0% | 🔄 Média |
| 7. Utilitários Centralizados | ⏳ Aguardando | 0% | 🔄 Média |
| 8. Sistema de Tipos | ⏳ Aguardando | 0% | 📋 Baixa |
| 9. Refatoração de Modais | ⏳ Aguardando | 0% | 📋 Baixa |
| 10. Otimização Final | ⏳ Aguardando | 0% | 🔄 Média |

### 📝 Última Atualização
- ✅ **Componentes UI base criados** e parcialmente integrados
- ✅ **9 componentes implementados**: `Button`, `Input`, `Select`, `Checkbox`, `FormField`, `Dropdown`, `EntitySelectField`, `ConfirmModal`, `types.ts`
- ✅ **Em uso**: `Button` no Layout e `EntitySelectField` em modais de contratos
- ⏳ **Pendente**: Implementar `Modal.tsx` base e completar migração de componentes existentes

---

## 🚀 Plano de Refatoração por Etapas

### [🟡 Em Progresso] Etapa 1: Componentes UI Base
**Objetivo**: Criar componentes UI fundamentais e reutilizáveis
**Status**: Parcialmente concluída (75%)
**Arquivos afetados**: 
- `frontend/src/components/ui/` ✅ Criada
- Todos os modais existentes (em migração)
- Componentes que usam botões e inputs (em migração)

**Componentes criados**:
- ✅ `Button.tsx` - Botão base com variantes (implementado e sendo usado no Layout)
- ✅ `Input.tsx` - Input base com validação (implementado)
- ✅ `Select.tsx` - Select base com busca (implementado)
- ✅ `Checkbox.tsx` - Checkbox base (implementado)
- ✅ `FormField.tsx` - Campo de formulário completo (implementado)
- ✅ `Dropdown.tsx` - Dropdown reutilizável (implementado)
- ✅ `EntitySelectField.tsx` - Select para entidades (implementado e em uso)
- ✅ `ConfirmModal.tsx` - Modal de confirmação (implementado)
- ✅ `types.ts` - Tipos TypeScript unificados (implementado)
- ✅ `ui.css` - Estilos dos componentes (implementado)
- ✅ `index.ts` - Exports centralizados (implementado)
- ⏳ `Modal.tsx` - Modal base simplificado (a ser implementado)

**Documentação**: Veja [README dos Componentes UI](frontend/src/components/ui/README.md) para detalhes de uso.

**Componentes já em uso**:
- `Button` usado em `Layout.tsx`
- `EntitySelectField` usado em modais de contratos

**Próximos passos**:
- Migrar mais componentes para usar os novos componentes UI
- Implementar `Modal.tsx` base
- Completar integração com todos os modais

**Testes necessários**:
- ✅ Renderização dos componentes
- ⏳ Validações funcionando (parcialmente testado)
- ⏳ Integração completa com formulários existentes

**Estimativa de complexidade**: Baixa

---

### [ ] Etapa 2: Sistema de Formulários Unificado
**Objetivo**: Criar sistema de formulários reutilizável com validação
**Arquivos afetados**:
- `frontend/src/components/forms/` (nova pasta)
- Todos os modais de criação/edição
- `frontend/src/hooks/useFormReset.ts`

**Componentes a criar/refatorar**:
- `Form.tsx` - Formulário base com validação
- `FormProvider.tsx` - Context para formulários
- `useForm.ts` - Hook para gerenciar formulários
- `ValidationRules.ts` - Regras de validação centralizadas
- `FormFieldWrapper.tsx` - Wrapper para campos

**Testes necessários**:
- Validação de formulários
- Reset de formulários
- Integração com modais existentes

**Estimativa de complexidade**: Média

---

### [ ] Etapa 3: Sistema de Tabelas Unificado
**Objetivo**: Unificar DataTable e ModernTable em um sistema único
**Arquivos afetados**:
- `frontend/src/components/common/DataTable.tsx`
- `frontend/src/components/common/ModernTable.tsx`
- `frontend/src/components/common/TableFilters.tsx`
- `frontend/src/hooks/useSorting.ts`

**Componentes a criar/refatorar**:
- `Table.tsx` - Tabela unificada
- `TableColumn.tsx` - Definição de colunas
- `TableActions.tsx` - Ações da tabela
- `TablePagination.tsx` - Paginação
- `TableFilters.tsx` - Filtros unificados
- `useTable.ts` - Hook para gerenciar tabelas

**Testes necessários**:
- Ordenação funcionando
- Paginação funcionando
- Filtros funcionando
- Ações em massa funcionando

**Estimativa de complexidade**: Média

---

### [ ] Etapa 4: Sistema de Modais Unificado
**Objetivo**: Criar sistema de modais reutilizável e padronizado
**Arquivos afetados**:
- `frontend/src/components/common/DraggableModal.tsx`
- `frontend/src/components/common/ConfirmModal.tsx`
- Todos os modais específicos
- `frontend/src/components/layout/Layout.tsx`

**Componentes a criar/refatorar**:
- `Modal.tsx` - Modal base unificado
- `ModalProvider.tsx` - Context para modais
- `useModal.ts` - Hook para gerenciar modais
- `ConfirmModal.tsx` - Modal de confirmação
- `FormModal.tsx` - Modal para formulários
- `TableModal.tsx` - Modal para tabelas

**Testes necessários**:
- Abertura/fechamento de modais
- Stack de modais funcionando
- Drag and drop funcionando
- Responsividade

**Estimativa de complexidade**: Alta

---

### [ ] Etapa 5: Hooks Customizados Unificados
**Objetivo**: Padronizar e unificar todos os hooks customizados
**Arquivos afetados**:
- `frontend/src/hooks/` (todos os arquivos)
- Todos os componentes que usam hooks

**Hooks a criar/refatorar**:
- `useApi.ts` - Hook base para APIs
- `useCrud.ts` - Hook para operações CRUD
- `usePagination.ts` - Hook para paginação
- `useFilters.ts` - Hook para filtros
- `useSearch.ts` - Hook para busca
- `useNotification.ts` - Hook para notificações
- `useConfirm.ts` - Hook para confirmações

**Testes necessários**:
- Operações CRUD funcionando
- Cache funcionando
- Invalidação de cache funcionando
- Estados de loading funcionando

**Estimativa de complexidade**: Média

---

### [ ] Etapa 6: Serviços de API Unificados
**Objetivo**: Padronizar e unificar todos os serviços de API
**Arquivos afetados**:
- `frontend/src/services/` (todos os arquivos)
- `frontend/src/services/api.ts`

**Serviços a criar/refatorar**:
- `BaseService.ts` - Classe base para serviços
- `ApiClient.ts` - Cliente HTTP unificado
- `ServiceFactory.ts` - Factory para criar serviços
- `ErrorHandler.ts` - Tratamento de erros centralizado
- `ResponseTransformer.ts` - Transformação de respostas

**Testes necessários**:
- Requisições HTTP funcionando
- Tratamento de erros funcionando
- Interceptors funcionando
- Timeout funcionando

**Estimativa de complexidade**: Média

---

### [ ] Etapa 7: Utilitários e Helpers Centralizados
**Objetivo**: Centralizar e padronizar utilitários e funções helper
**Arquivos afetados**:
- `frontend/src/utils/` (nova pasta)
- `frontend/src/components/common/VariaveisDocumento.tsx`
- `frontend/src/components/common/VariablePlugin.ts`

**Utilitários a criar/refatorar**:
- `formatters.ts` - Formatação de dados
- `validators.ts` - Validações centralizadas
- `constants.ts` - Constantes do sistema
- `helpers.ts` - Funções helper gerais
- `dateUtils.ts` - Utilitários de data
- `stringUtils.ts` - Utilitários de string
- `numberUtils.ts` - Utilitários de número

**Testes necessários**:
- Formatação funcionando
- Validações funcionando
- Constantes sendo usadas
- Helpers funcionando

**Estimativa de complexidade**: Baixa

---

### [ ] Etapa 8: Sistema de Tipos Unificado
**Objetivo**: Reorganizar e unificar sistema de tipos TypeScript
**Arquivos afetados**:
- `frontend/src/types/` (todos os arquivos)
- Todos os componentes que usam tipos

**Tipos a criar/refatorar**:
- `entities.ts` - Entidades do sistema
- `api.ts` - Tipos de API
- `forms.ts` - Tipos de formulários
- `tables.ts` - Tipos de tabelas
- `modals.ts` - Tipos de modais
- `common.ts` - Tipos comuns
- `index.ts` - Re-exports organizados

**Testes necessários**:
- Compilação TypeScript funcionando
- Tipos sendo usados corretamente
- IntelliSense funcionando

**Estimativa de complexidade**: Baixa

---

### [ ] Etapa 9: Refatoração dos Modais Específicos
**Objetivo**: Refatorar todos os modais específicos usando o sistema unificado
**Arquivos afetados**:
- `frontend/src/components/modals/` (todos os arquivos)
- `frontend/src/components/layout/Layout.tsx`

**Modais a refatorar**:
- `ClienteCreateModal.tsx` → usar FormModal
- `ClienteEditModal.tsx` → usar FormModal
- `PlanoCreateModal.tsx` → usar FormModal
- `BancoCreateModal.tsx` → usar FormModal
- `ParametrosModal.tsx` → usar FormModal
- `DocumentoModal.tsx` → usar FormModal
- Todos os outros modais específicos

**Testes necessários**:
- Criação funcionando
- Edição funcionando
- Validações funcionando
- Integração com APIs funcionando

**Estimativa de complexidade**: Alta

---

### [ ] Etapa 10: Otimização e Limpeza Final
**Objetivo**: Otimizar performance e limpar código desnecessário
**Arquivos afetados**:
- Todo o projeto frontend
- `frontend/src/components/pages/Dashboard.tsx`

**Otimizações a fazer**:
- Remover código duplicado
- Otimizar re-renders
- Implementar lazy loading
- Otimizar bundle size
- Melhorar acessibilidade
- Adicionar testes unitários

**Testes necessários**:
- Performance melhorada
- Bundle size reduzido
- Acessibilidade funcionando
- Testes passando

**Estimativa de complexidade**: Média

## 📁 Estrutura de Pastas Proposta

```
frontend/src/
├── components/
│   ├── ui/                    # Componentes UI base
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Modal.tsx
│   │   └── FormField.tsx
│   ├── forms/                 # Sistema de formulários
│   │   ├── Form.tsx
│   │   ├── FormProvider.tsx
│   │   ├── FormFieldWrapper.tsx
│   │   └── ValidationRules.ts
│   ├── tables/                # Sistema de tabelas
│   │   ├── Table.tsx
│   │   ├── TableColumn.tsx
│   │   ├── TableActions.tsx
│   │   ├── TablePagination.tsx
│   │   └── TableFilters.tsx
│   ├── modals/                # Sistema de modais
│   │   ├── Modal.tsx
│   │   ├── ModalProvider.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── FormModal.tsx
│   │   └── TableModal.tsx
│   ├── layout/                # Layout da aplicação
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── pages/                 # Páginas da aplicação
│       ├── Dashboard.tsx
│       ├── Login.tsx
│       └── forms/
├── hooks/                     # Hooks customizados
│   ├── useApi.ts
│   ├── useCrud.ts
│   ├── usePagination.ts
│   ├── useFilters.ts
│   ├── useSearch.ts
│   ├── useNotification.ts
│   ├── useConfirm.ts
│   └── useForm.ts
├── services/                  # Serviços de API
│   ├── BaseService.ts
│   ├── ApiClient.ts
│   ├── ServiceFactory.ts
│   ├── ErrorHandler.ts
│   └── ResponseTransformer.ts
├── utils/                     # Utilitários
│   ├── formatters.ts
│   ├── validators.ts
│   ├── constants.ts
│   ├── helpers.ts
│   ├── dateUtils.ts
│   ├── stringUtils.ts
│   └── numberUtils.ts
├── types/                     # Tipos TypeScript
│   ├── entities.ts
│   ├── api.ts
│   ├── forms.ts
│   ├── tables.ts
│   ├── modals.ts
│   ├── common.ts
│   └── index.ts
├── contexts/                  # Contextos React
│   ├── NotificationContext.tsx
│   ├── ThemeContext.tsx
│   └── ModalContext.tsx
└── config/                    # Configurações
    ├── api.ts
    ├── constants.ts
    └── routes.ts
```

## ✅ Checklist de Cada Etapa

### Para cada etapa, seguir este checklist:

- [ ] **Criar novos componentes/arquivos**
  - [ ] Criar estrutura de pastas
  - [ ] Implementar componentes base
  - [ ] Adicionar tipos TypeScript
  - [ ] Adicionar testes unitários

- [ ] **Migrar código existente**
  - [ ] Identificar código a ser migrado
  - [ ] Refatorar componentes existentes
  - [ ] Atualizar imports
  - [ ] Manter funcionalidades existentes

- [ ] **Testar funcionalidade**
  - [ ] Testar componentes isoladamente
  - [ ] Testar integração com sistema existente
  - [ ] Testar casos de erro
  - [ ] Testar responsividade

- [ ] **Remover código antigo**
  - [ ] Identificar código obsoleto
  - [ ] Remover arquivos não utilizados
  - [ ] Limpar imports não utilizados
  - [ ] Atualizar documentação

- [ ] **Commit da etapa**
  - [ ] Fazer commit com mensagem descritiva
  - [ ] Criar tag para a etapa
  - [ ] Atualizar documentação
  - [ ] Testar em ambiente de desenvolvimento

## 🎯 Prioridades de Refatoração

### Alta Prioridade ⚡
1. ✅ ~~**Componentes UI Base**~~ - Base para tudo (75% concluído)
2. **Sistema de Formulários** - Usado em todos os modais (reduzirá muito código duplicado)
3. **Sistema de Tabelas** - Usado em toda aplicação (unificar DataTable e ModernTable)
4. **Hooks Customizados** - Padronização de lógica CRUD (reduzirá duplicação significativa)

### Média Prioridade 🔄
5. **Sistema de Modais** - Melhora UX e padronização
6. **Serviços de API** - Padronização de comunicação
7. **Utilitários Centralizados** - Reutilização de código

### Baixa Prioridade 📋
8. **Sistema de Tipos** - Organização e manutenibilidade
9. **Refatoração de Modais Específicos** - Aplicação do sistema unificado
10. **Otimização Final** - Performance e limpeza

## 🚀 Como Começar

1. **Criar branch para refatoração**:
   ```bash
   git checkout -b refactor/etapa-[numero]-[nome-da-etapa]
   # Exemplo: git checkout -b refactor/etapa-2-formularios-unificados
   ```

2. **Próxima etapa recomendada**:
   - ✅ Etapa 1 está 75% concluída - completar implementação do `Modal.tsx` base e migração de componentes
   - 🎯 Próxima: **Etapa 2 - Sistema de Formulários Unificado** (alta prioridade)
   - Criar pasta `frontend/src/components/forms/`
   - Implementar sistema base de formulários
   - Testar integração com componentes UI existentes

3. **Para cada etapa concluída**:
   - Fazer commit com mensagem descritiva
   - Criar tag para a etapa (opcional)
   - Testar funcionalidade completa
   - Atualizar este README com progresso
   - Documentar mudanças

4. **Ferramentas úteis**:
   - Use **Cursor Composer** (Cmd/Ctrl + I) para trabalhar em múltiplos arquivos simultaneamente
   - Consulte o [README dos Componentes UI](frontend/src/components/ui/README.md) ao trabalhar com componentes base

## 📝 Notas Importantes

- **Não quebrar funcionalidades existentes** durante a refatoração
- **Manter compatibilidade** com código existente
- **Testar cada etapa** antes de prosseguir
- **Documentar mudanças** em cada commit
- **Usar TypeScript** com tipagem forte
- **Seguir padrões** estabelecidos no projeto
- **Priorizar reutilização** de código
- **Manter performance** da aplicação

---

**Próximos passos recomendados**:
1. **Completar Etapa 1**: Implementar `Modal.tsx` base e finalizar migração de componentes para usar os novos componentes UI
2. **Iniciar Etapa 2**: Criar sistema de formulários unificado para reduzir duplicação de código nos modais
3. **Atualizar este README**: Conforme cada etapa for concluída, atualizar o status e progresso
