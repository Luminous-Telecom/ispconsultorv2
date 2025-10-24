# CTM Telecom ERP - Plano de Refatoração

## 📋 Visão Geral do Projeto Atual

### Estrutura de Pastas Existente
```
ctm-telecom/
├── backend/                    # API Node.js/TypeScript
│   ├── src/
│   │   ├── controllers/        # Controllers das entidades
│   │   ├── models/            # Modelos Sequelize
│   │   ├── routes/            # Definição de rotas
│   │   ├── services/          # Lógica de negócio
│   │   ├── middleware/        # Middlewares customizados
│   │   ├── utils/             # Utilitários
│   │   ├── migrations/        # Migrações do banco
│   │   └── templates/         # Templates HTML/PDF
│   └── package.json
├── frontend/                   # React/TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Componentes reutilizáveis
│   │   │   ├── modals/        # Modais específicos
│   │   │   ├── layout/        # Layout principal
│   │   │   └── pages/         # Páginas da aplicação
│   │   ├── hooks/             # Hooks customizados
│   │   ├── services/          # Serviços de API
│   │   ├── types/             # Definições TypeScript
│   │   ├── contexts/          # Contextos React
│   │   ├── utils/             # Utilitários
│   │   └── config/            # Configurações
│   └── package.json
└── package.json               # Scripts do projeto
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

## 🚀 Plano de Refatoração por Etapas

### [ ] Etapa 1: Componentes UI Base
**Objetivo**: Criar componentes UI fundamentais e reutilizáveis
**Arquivos afetados**: 
- `frontend/src/components/ui/` (nova pasta)
- Todos os modais existentes
- Componentes que usam botões e inputs

**Componentes a criar/refatorar**:
- `Button.tsx` - Botão base com variantes
- `Input.tsx` - Input base com validação
- `Select.tsx` - Select base com busca
- `Checkbox.tsx` - Checkbox base
- `Modal.tsx` - Modal base simplificado
- `FormField.tsx` - Campo de formulário completo

**Testes necessários**:
- Renderização dos componentes
- Validações funcionando
- Integração com formulários existentes

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

### Alta Prioridade
1. **Componentes UI Base** - Base para tudo
2. **Sistema de Formulários** - Usado em todos os modais
3. **Sistema de Tabelas** - Usado em toda aplicação
4. **Hooks Customizados** - Padronização de lógica

### Média Prioridade
5. **Sistema de Modais** - Melhora UX
6. **Serviços de API** - Padronização de comunicação
7. **Utilitários Centralizados** - Reutilização de código

### Baixa Prioridade
8. **Sistema de Tipos** - Organização e manutenibilidade
9. **Refatoração de Modais Específicos** - Aplicação do sistema
10. **Otimização Final** - Performance e limpeza

## 🚀 Como Começar

1. **Criar branch para refatoração**:
   ```bash
   git checkout -b refactor/etapa-1-componentes-ui
   ```

2. **Começar pela Etapa 1**:
   - Criar pasta `frontend/src/components/ui/`
   - Implementar componentes base
   - Testar integração

3. **Para cada etapa concluída**:
   - Fazer commit com mensagem descritiva
   - Criar tag para a etapa
   - Testar funcionalidade completa
   - Documentar mudanças

4. **Usar Cursor Composer** (Cmd/Ctrl + I) para trabalhar em múltiplos arquivos simultaneamente durante a refatoração.

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

**Próximo passo**: Começar pela Etapa 1 - Componentes UI Base. Crie os arquivos necessários e me mostre o código dos componentes a serem criados.
