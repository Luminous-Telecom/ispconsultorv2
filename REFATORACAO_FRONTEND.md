# Documento de Refatoração - BackNet ERP Frontend

## 1. Análise do Código Atual

### 1.1 Bibliotecas e Frameworks em Uso

- **React**: 19.1.1
- **TypeScript**: 4.9.5
- **Bootstrap**: 5.3.0 ✅ (já instalado)
- **Bootstrap Icons**: 1.13.1 ✅
- **React Router DOM**: 7.9.1
- **React Query (@tanstack/react-query)**: 5.90.1
- **Recharts**: 3.3.0 ✅ (já em uso no Dashboard)
- **React Hook Form**: 7.66.1
- **Zod**: 4.1.12

### 1.2 Estrutura Atual de Arquivos

```
frontend/src/
├── components/
│   ├── charts/ ✅ (bem estruturado)
│   ├── common/ ✅ (DraggableModal, ResponsiveDialog, Loading, etc)
│   ├── forms/ ✅ (AddressFields, ContactFields)
│   ├── layout/ ✅ (Layout.tsx - sidebar e header)
│   ├── modals/ ✅ (organizado por entidade)
│   ├── notifications/ ✅ (sistema completo implementado)
│   ├── pages/ ✅ (Home, Dashboard, Login, PagamentoPublico)
│   ├── tables/ ✅ (Table component completo)
│   └── ui/ ✅ (Button, Input, Select, Checkbox, FormField)
├── contexts/ ✅ (ThemeContext, NotificationProvider, etc)
├── hooks/ ✅ (15 hooks customizados)
├── services/ ✅ (estrutura completa com BaseService)
├── styles/ ✅ (themes.css - 4300+ linhas)
├── types/ ✅
└── utils/ ✅
```

### 1.3 Pontos Positivos Identificados

✅ **Bootstrap 5 já instalado e configurado**  
✅ **Sistema de tema claro/escuro implementado** (`ThemeContext`)  
✅ **Sistema de notificações centralizado** (`NotificationProvider`)  
✅ **Componentes UI básicos criados** (Button, Input, Select, Checkbox)  
✅ **Tabelas reutilizáveis** (Table component com ordenação e paginação)  
✅ **Modais responsivos** (DraggableModal, ResponsiveDialog)  
✅ **Dashboard profissional** com gráficos (Recharts)  
✅ **Layout responsivo** com sidebar colapsável  
✅ **TypeScript bem tipado**  
✅ **React Query para gerenciamento de estado**  
✅ **Estrutura de pastas organizada**

### 1.4 Problemas Principais Identificados

❌ **268 ocorrências de estilos inline** (`style={}`)  
❌ **29 ocorrências de `window.confirm()`** (precisa substituir por modais Bootstrap)  
❌ **5 ocorrências de `alert()`** (precisa substituir por sistema de notificações)  
❌ **Arquivo `themes.css` muito grande** (4300+ linhas - precisa ser modularizado)  
❌ **CSS duplicado** em vários arquivos  
❌ **Botões nativos HTML** ainda usados em alguns lugares  
❌ **Falta de componentes reutilizáveis** (Card, Badge, Spinner padronizado)  
❌ **Tabelas não usam Bootstrap Table** em todos os lugares  
❌ **Modais customizados** ao invés de Bootstrap Modal em alguns casos  
❌ **Falta padronização** de cores usando variáveis CSS do Bootstrap  

### 1.5 Estatísticas de Código

- **Total de arquivos .tsx**: ~96 arquivos
- **Total de arquivos .ts**: ~65 arquivos
- **Arquivos CSS**: 10 arquivos
- **Estilos inline**: 268 ocorrências
- **Alerts nativos**: 5 ocorrências
- **Confirms nativos**: 29 ocorrências
- **Componentes UI**: 8 componentes
- **Contexts**: 5 contexts
- **Hooks customizados**: 15 hooks

---

## 2. Estrutura de Arquivos Proposta

### 2.1 Estrutura Ideal

```
frontend/src/
├── components/
│   ├── charts/ ✅ (manter como está)
│   ├── common/ ✅ (manter, adicionar componentes)
│   │   ├── Card.tsx ⚠️ (criar)
│   │   ├── Badge.tsx ⚠️ (criar)
│   │   ├── Spinner.tsx ⚠️ (criar)
│   │   └── ... (manter existentes)
│   ├── forms/ ✅ (manter como está)
│   ├── layout/ ✅ (melhorar Layout.tsx)
│   ├── modals/ ✅ (substituir modais customizados por Bootstrap)
│   │   ├── BaseModal.tsx ⚠️ (criar wrapper Bootstrap)
│   │   ├── ConfirmModal.tsx ⚠️ (criar)
│   │   └── FormModal.tsx ⚠️ (criar)
│   ├── notifications/ ✅ (manter como está - já está ótimo)
│   ├── pages/ ✅ (manter como está)
│   ├── tables/ ✅ (melhorar para usar mais Bootstrap)
│   └── ui/ ✅ (adicionar componentes faltantes)
│       ├── Button.tsx ✅
│       ├── Input.tsx ✅
│       ├── Select.tsx ✅
│       ├── Checkbox.tsx ✅
│       ├── Card.tsx ⚠️ (mover de common para ui)
│       ├── Badge.tsx ⚠️ (criar)
│       ├── Spinner.tsx ⚠️ (criar)
│       └── ... (manter existentes)
├── contexts/ ✅ (manter como está)
├── hooks/ ✅ (manter como está, adicionar se necessário)
├── services/ ✅ (manter como está)
├── styles/ ⚠️ (modularizar)
│   ├── _variables.scss ⚠️ (criar - variáveis Bootstrap customizadas)
│   ├── _mixins.scss ⚠️ (criar)
│   ├── themes.scss ⚠️ (converter de CSS para SCSS)
│   ├── bootstrap-custom.scss ⚠️ (criar - customizações Bootstrap)
│   ├── components.scss ⚠️ (criar - estilos de componentes)
│   └── index.scss ⚠️ (criar - importar tudo)
├── types/ ✅ (manter como está)
└── utils/ ✅ (manter como está)
```

### 2.2 Arquivos que Precisam ser Criados

- [ ] `src/components/ui/Card.tsx`
- [ ] `src/components/ui/Badge.tsx`
- [ ] `src/components/ui/Spinner.tsx`
- [ ] `src/components/modals/BaseModal.tsx` (wrapper Bootstrap Modal)
- [ ] `src/components/modals/ConfirmModal.tsx`
- [ ] `src/components/modals/FormModal.tsx`
- [ ] `src/styles/_variables.scss`
- [ ] `src/styles/_mixins.scss`
- [ ] `src/styles/bootstrap-custom.scss`
- [ ] `src/styles/components.scss`
- [ ] `src/styles/themes.scss` (converter de CSS)
- [ ] `src/styles/index.scss`

### 2.3 Arquivos que Precisam ser Modificados

- [ ] `src/styles/themes.css` → modularizar em vários arquivos SCSS
- [ ] Todos os 96 arquivos `.tsx` que têm `style={}` → remover estilos inline
- [ ] 29 arquivos com `window.confirm()` → substituir por `ConfirmModal`
- [ ] 5 arquivos com `alert()` → substituir por sistema de notificações
- [ ] `src/components/layout/Layout.tsx` → melhorar responsividade
- [ ] `src/components/tables/Table.tsx` → usar mais classes Bootstrap

---

## 3. Mudanças por Categoria

### 3.1 Remover Estilos Inline (268 ocorrências)

**Prioridade:** 🔴 CRÍTICA

**Descrição:**  
Substituir todos os estilos inline (`style={}`) por classes Bootstrap ou estilos CSS em arquivos separados.

**Arquivos com mais estilos inline:**

1. **`src/components/tables/Table.tsx`** - 45 ocorrências
   - Linhas 634, 667, 978, 986, 1015, 1034, 1116, 1241, 1251, 1260, 1319, 1323, 1326, 1327, 1348, 1358, 1365, 1410, 1426, 1440, 1461, 1487, 1600, 1601, 1645, 1745
   - **Ação:** Criar classes CSS para estilos de tabela no `components.scss`

2. **`src/components/common/DraggableModal.tsx`** - 15 ocorrências
   - Linhas 365, 379, 395, 419, 434, 456, 489
   - **Ação:** Usar classes Bootstrap Modal + customizações CSS

3. **`src/components/common/ResponsiveDialog.tsx`** - 18 ocorrências
   - Linhas 86, 104, 121, 159, 180, 188, 209, 230, 248, 289, 332, 384, 400, 410
   - **Ação:** Usar Bootstrap Modal classes

4. **`src/components/modals/clientes/contrato/ContratoModal.tsx`** - 12 ocorrências
   - **Ação:** Criar classes CSS específicas para este modal

5. **`src/components/modals/financeiro/FinanceiroModal.tsx`** - 10 ocorrências
   - Linhas 702, 703, 704, 782, 791, 826
   - **Ação:** Criar classes CSS para layout financeiro

6. **`src/components/layout/Layout.tsx`** - 8 ocorrências
   - Linhas 235, 512-524, 542, 548-559
   - **Ação:** Mover para arquivo CSS do layout

7. **Demais arquivos** - ~160 ocorrências
   - **Ação:** Revisar cada arquivo e criar classes CSS apropriadas

**Plano de Ação:**
1. Criar arquivo `src/styles/components.scss` com todas as classes necessárias
2. Identificar padrões de estilos repetidos e criar classes reutilizáveis
3. Substituir estilos inline um arquivo por vez, começando pelos mais usados
4. Testar cada substituição para garantir que não quebra a UI

---

### 3.2 Substituir `window.confirm()` por Modais Bootstrap (29 ocorrências)

**Prioridade:** 🔴 ALTA

**Descrição:**  
Criar componente `ConfirmModal` usando Bootstrap Modal e substituir todos os `window.confirm()`.

**Arquivos com `window.confirm()`:**

1. **`src/components/modals/parametros/AtualizacoesModal.tsx`** (linha 163)
   ```typescript
   if (!window.confirm('Tem certeza que deseja atualizar o sistema? ...'))
   ```

2. **`src/components/modals/parametros/documentos-sistema/abas/DocumentoTab.tsx`** (linha 215)
   ```typescript
   if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} documento(s)?`))
   ```

3. **`src/components/modals/clientes/ClienteListModal.tsx`** (linha 242)
   ```typescript
   if (item && window.confirm('Tem certeza que deseja excluir este cliente?'))
   ```

4. **`src/components/modals/parametros/AgendadorTarefasModal.tsx`** (linhas 188, 204)
   ```typescript
   if (!window.confirm('Deseja executar a rotina agora?')) return;
   if (!window.confirm('Tem certeza que deseja deletar esta rotina?')) return;
   ```

5. **`src/hooks/useClienteEditModal.ts`** (linhas 139, 171)
   ```typescript
   const confirmar = window.confirm(...)
   ```

6. **`src/components/modals/contratos/ContratoListModal.tsx`** (linha 333)
   ```typescript
   window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)
   ```

7. **`src/components/modals/bancos/BancoListModal.tsx`** (linha 236)
   ```typescript
   if (item && window.confirm('Tem certeza que deseja excluir este banco?'))
   ```

8. **`src/components/modals/contas-pagar/ContasPagarListModal.tsx`** (linha 511)
   ```typescript
   if (item && window.confirm('Tem certeza que deseja excluir esta conta a pagar?'))
   ```

9. **`src/components/modals/clientes/contrato/abas/RecibosTab.tsx`** (linha 170)
   ```typescript
   if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} recibo(s)?`))
   ```

10. **`src/components/modals/fornecedores/FornecedorListModal.tsx`** (linha 290)
    ```typescript
    if (item && window.confirm('Tem certeza que deseja excluir este fornecedor?'))
    ```

11. **`src/components/modals/financeiro/FinanceiroModal.tsx`** (linhas 564, 616)
    ```typescript
    if (window.confirm(confirmMessage))
    const confirmar = window.confirm(...)
    ```

12. **`src/components/modals/clientes/contrato/abas/CartaCobrancaTab.tsx`** (linha 170)
    ```typescript
    if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} carta(s) de cobrança?`))
    ```

13. **`src/components/modals/planos/PlanoListModal.tsx`** (linha 272)
    ```typescript
    if (item && window.confirm('Tem certeza que deseja excluir este plano?'))
    ```

14. **`src/components/tables/TableActions.tsx`** (linhas 57, 69)
    ```typescript
    if (window.confirm(action.confirm.message))
    ```

15. **`src/components/modals/clientes/cliente/abas/ArquivosTab.tsx`** (linha 183)
    ```typescript
    if (window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} arquivo(s)?`))
    ```

16. **`src/hooks/useClienteBulkActions.ts`** (linhas 101, 146, 274)
    ```typescript
    if (window.confirm(confirmMessage))
    const confirmar = window.confirm(...)
    ```

17. **`src/components/modals/clientes/contrato/ContratoModal.tsx`** (linhas 541, 593, 796, 848, 1045, 1139)
    ```typescript
    if (window.confirm(confirmMessage))
    const confirmar = window.confirm(...)
    ```

18. **`src/components/modals/parametros/UsuariosModal.tsx`** (linha 187)
    ```typescript
    window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} usuário(s)?`)
    ```

**Arquivos a criar:**
- [ ] `src/components/modals/ConfirmModal.tsx`
- [ ] `src/hooks/useConfirmModal.ts` (hook para facilitar uso)

**Implementação:**
```typescript
// ConfirmModal.tsx - Wrapper Bootstrap Modal
interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

// useConfirmModal.ts - Hook para facilitar uso
const useConfirmModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmConfig>(null);
  
  const confirm = (config: ConfirmConfig) => {
    return new Promise<boolean>((resolve) => {
      setConfig({ ...config, resolve });
      setIsOpen(true);
    });
  };
  
  return { confirm, ConfirmModal: <ConfirmModal ... /> };
};
```

**Uso:**
```typescript
// Antes:
if (window.confirm('Tem certeza?')) {
  handleDelete();
}

// Depois:
const { confirm } = useConfirmModal();
if (await confirm({ 
  message: 'Tem certeza?', 
  variant: 'danger' 
})) {
  handleDelete();
}
```

---

### 3.3 Substituir `alert()` por Sistema de Notificações (5 ocorrências)

**Prioridade:** 🔴 ALTA

**Descrição:**  
Já existe `NotificationProvider` implementado. Substituir todos os `alert()` por notificações.

**Arquivos com `alert()`:**

1. **`src/components/pages/PagamentoPublico.tsx`** (linha 67)
   ```typescript
   alert('Erro ao copiar. Por favor, selecione o texto manualmente.');
   ```
   **Substituir por:**
   ```typescript
   const { error } = useNotificationContext();
   error('Erro ao copiar. Por favor, selecione o texto manualmente.');
   ```

2. **`src/components/modals/parametros/AgendadorTarefasModal.tsx`** (linhas 180, 182, 211, 213)
   ```typescript
   alert(`Erro ao atualizar status: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
   alert('Erro ao atualizar status: Erro desconhecido');
   alert(`Erro ao deletar rotina: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
   alert('Erro ao deletar rotina: Erro desconhecido');
   ```
   **Substituir por:**
   ```typescript
   const { error } = useNotificationContext();
   error(`Erro ao atualizar status: ${axiosError.response?.data?.message || 'Erro desconhecido'}`);
   ```

**Ação:**  
Simples substituição - apenas importar `useNotificationContext` e usar `error()` ao invés de `alert()`.

---

### 3.4 Modularizar CSS (themes.css - 4300+ linhas)

**Prioridade:** 🟡 MÉDIA

**Descrição:**  
Dividir o arquivo `themes.css` gigante em múltiplos arquivos SCSS organizados.

**Estrutura proposta:**

```
src/styles/
├── _variables.scss         ⚠️ (variáveis CSS do tema)
├── _mixins.scss            ⚠️ (mixins reutilizáveis)
├── bootstrap-custom.scss   ⚠️ (customizações Bootstrap)
├── themes.scss             ⚠️ (converter de themes.css)
│   ├── _light-theme.scss   ⚠️ (estilos tema claro)
│   └── _dark-theme.scss    ⚠️ (estilos tema escuro)
├── components.scss         ⚠️ (estilos de componentes)
│   ├── _layout.scss        ⚠️ (Layout, Sidebar, Header)
│   ├── _table.scss         ⚠️ (Table component)
│   ├── _modal.scss         ⚠️ (Modais)
│   ├── _dashboard.scss     ⚠️ (Dashboard)
│   └── _forms.scss         ⚠️ (Formulários)
├── pages.scss              ⚠️ (estilos de páginas)
│   ├── _home.scss          ⚠️ (Home page)
│   ├── _login.scss         ⚠️ (Login page)
│   └── _dashboard.scss     ⚠️ (Dashboard - se necessário)
└── index.scss              ⚠️ (importar tudo)
```

**Arquivos a criar:**
- [ ] `src/styles/_variables.scss`
- [ ] `src/styles/_mixins.scss`
- [ ] `src/styles/bootstrap-custom.scss`
- [ ] `src/styles/themes.scss`
- [ ] `src/styles/themes/_light-theme.scss`
- [ ] `src/styles/themes/_dark-theme.scss`
- [ ] `src/styles/components.scss`
- [ ] `src/styles/components/_layout.scss`
- [ ] `src/styles/components/_table.scss`
- [ ] `src/styles/components/_modal.scss`
- [ ] `src/styles/components/_dashboard.scss`
- [ ] `src/styles/components/_forms.scss`
- [ ] `src/styles/pages.scss`
- [ ] `src/styles/pages/_home.scss`
- [ ] `src/styles/pages/_login.scss`
- [ ] `src/styles/index.scss`

**Instalar SASS:**
```bash
npm install sass --save-dev
```

**Plano de Migração:**
1. Instalar SASS
2. Criar estrutura de arquivos SCSS
3. Migrar `themes.css` para SCSS modular
4. Atualizar imports no `index.tsx`
5. Testar que tudo funciona

---

### 3.5 Criar Componentes Reutilizáveis Faltantes

**Prioridade:** 🟡 MÉDIA

**Arquivos a criar:**

#### 3.5.1 Card Component

- [ ] `src/components/ui/Card.tsx`

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Uso:**
```tsx
<Card variant="elevated" header={<h5>Título</h5>} footer={<Button>Salvar</Button>}>
  Conteúdo do card
</Card>
```

#### 3.5.2 Badge Component

- [ ] `src/components/ui/Badge.tsx`

```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  pill?: boolean;
  className?: string;
}
```

**Uso:**
```tsx
<Badge variant="success" pill>Ativo</Badge>
```

#### 3.5.3 Spinner Component

- [ ] `src/components/ui/Spinner.tsx`

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'light' | 'dark';
  className?: string;
}
```

**Uso:**
```tsx
<Spinner size="sm" variant="primary" />
```

**Arquivos que usam spinners nativos a substituir:**
- [ ] `src/components/tables/Table.tsx` (linha 693, 940)
- [ ] `src/components/pages/Dashboard.tsx` (linha 60)
- [ ] Vários outros arquivos com `spinner-border`

---

### 3.6 Padronizar Uso de Bootstrap Modal

**Prioridade:** 🟡 MÉDIA

**Descrição:**  
Criar wrapper `BaseModal` usando Bootstrap Modal oficial e padronizar todos os modais.

**Arquivos a criar:**
- [ ] `src/components/modals/BaseModal.tsx` (wrapper Bootstrap Modal)

**Implementação:**
```typescript
interface BaseModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
}
```

**Arquivos que precisam usar BaseModal:**
- [ ] `src/components/common/DraggableModal.tsx` - refatorar para usar BaseModal
- [ ] `src/components/common/ResponsiveDialog.tsx` - refatorar para usar BaseModal
- Verificar todos os modais em `src/components/modals/` para padronização

**Nota:** `DraggableModal` e `ResponsiveDialog` são modais customizados. Avaliar se devem ser mantidos ou completamente substituídos por Bootstrap Modal.

---

### 3.7 Melhorar Tabelas para Usar Mais Bootstrap

**Prioridade:** 🟢 BAIXA

**Descrição:**  
O componente `Table.tsx` já está bem implementado, mas pode melhorar para usar mais classes Bootstrap.

**Melhorias propostas:**
1. Usar mais classes Bootstrap (já usa bastante)
2. Remover estilos inline (45 ocorrências)
3. Criar classes CSS customizadas para estilos específicos

**Arquivo a modificar:**
- [ ] `src/components/tables/Table.tsx` - remover estilos inline

---

### 3.8 Padronizar Cores Usando Variáveis Bootstrap

**Prioridade:** 🟢 BAIXA

**Descrição:**  
Usar variáveis CSS do Bootstrap ao invés de valores hardcoded.

**Arquivos a criar:**
- [ ] `src/styles/_variables.scss` - definir variáveis Bootstrap customizadas

**Exemplo:**
```scss
// _variables.scss
$primary: #6366f1;
$secondary: #64748b;
$success: #10b981;
$danger: #ef4444;
$warning: #f59e0b;
$info: #3b82f6;

// Sobrescrever variáveis Bootstrap antes de importar
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins";
```

---

### 3.9 Melhorar Layout Responsivo

**Prioridade:** 🟢 BAIXA

**Descrição:**  
O layout já está bem responsivo, mas pode ser melhorado.

**Melhorias:**
1. Remover estilos inline do Layout.tsx (8 ocorrências)
2. Melhorar breakpoints se necessário
3. Otimizar sidebar para mobile

**Arquivo a modificar:**
- [ ] `src/components/layout/Layout.tsx` - remover estilos inline

---

### 3.10 Otimizar Dashboard

**Prioridade:** 🟢 BAIXA (já está bem implementado)

**Descrição:**  
O Dashboard já está muito bem implementado com Recharts. Apenas pequenos ajustes.

**Melhorias:**
1. Usar componente Card ao invés de `chart-card` (quando Card for criado)
2. Verificar se há estilos inline
3. Otimizar performance se necessário

---

## 4. Plano de Execução (Ordem de Implementação)

### Fase 1: Fundação e Ferramentas (Semana 1)

**Prioridade:** 🔴 CRÍTICA

1. [ ] **Instalar SASS**
   ```bash
   npm install sass --save-dev
   ```

2. [ ] **Criar estrutura de arquivos SCSS**
   - Criar pasta `src/styles/themes/`
   - Criar pasta `src/styles/components/`
   - Criar pasta `src/styles/pages/`

3. [ ] **Criar componentes base faltantes**
   - [ ] `src/components/ui/Card.tsx`
   - [ ] `src/components/ui/Badge.tsx`
   - [ ] `src/components/ui/Spinner.tsx`

4. [ ] **Criar ConfirmModal**
   - [ ] `src/components/modals/ConfirmModal.tsx`
   - [ ] `src/hooks/useConfirmModal.ts`

### Fase 2: Substituir Alertas e Confirms (Semana 2)

**Prioridade:** 🔴 ALTA

5. [ ] **Substituir todos os `alert()` por notificações**
   - [ ] `src/components/pages/PagamentoPublico.tsx`
   - [ ] `src/components/modals/parametros/AgendadorTarefasModal.tsx`

6. [ ] **Substituir todos os `window.confirm()` por ConfirmModal**
   - Substituir um arquivo por vez, testando cada mudança
   - Lista completa: 29 ocorrências em 18 arquivos (ver seção 3.2)

### Fase 3: Modularizar CSS (Semana 3)

**Prioridade:** 🟡 MÉDIA

7. [ ] **Migrar themes.css para SCSS modular**
   - [ ] Criar `_variables.scss`
   - [ ] Criar `_mixins.scss`
   - [ ] Migrar tema claro para `_light-theme.scss`
   - [ ] Migrar tema escuro para `_dark-theme.scss`
   - [ ] Criar `themes.scss` que importa tudo
   - [ ] Testar que temas funcionam

8. [ ] **Criar estilos de componentes**
   - [ ] `components/_layout.scss` (mover estilos do Layout.tsx)
   - [ ] `components/_table.scss` (mover estilos inline da Table.tsx)
   - [ ] `components/_modal.scss` (estilos de modais)
   - [ ] `components/_dashboard.scss` (se necessário)
   - [ ] `components/_forms.scss` (estilos de formulários)

9. [ ] **Criar estilos de páginas**
   - [ ] `pages/_home.scss`
   - [ ] `pages/_login.scss`

10. [ ] **Criar `index.scss` e atualizar imports**
    - [ ] Atualizar `src/index.tsx` para importar `index.scss`

### Fase 4: Remover Estilos Inline (Semana 4-5)

**Prioridade:** 🔴 CRÍTICA

11. [ ] **Remover estilos inline da Table.tsx** (45 ocorrências)
    - Criar classes CSS apropriadas
    - Testar minuciosamente

12. [ ] **Remover estilos inline do DraggableModal.tsx** (15 ocorrências)
    - Usar classes Bootstrap Modal
    - Criar classes CSS customizadas se necessário

13. [ ] **Remover estilos inline do ResponsiveDialog.tsx** (18 ocorrências)
    - Usar classes Bootstrap Modal

14. [ ] **Remover estilos inline do Layout.tsx** (8 ocorrências)
    - Mover para `components/_layout.scss`

15. [ ] **Remover estilos inline dos modais** (~100 ocorrências)
    - Um modal por vez
    - Testar cada mudança

16. [ ] **Remover estilos inline dos demais arquivos** (~82 ocorrências)
    - Revisar cada arquivo
    - Criar classes CSS quando necessário

### Fase 5: Padronizar Modais (Semana 6)

**Prioridade:** 🟡 MÉDIA

17. [ ] **Criar BaseModal (wrapper Bootstrap Modal)**
    - [ ] `src/components/modals/BaseModal.tsx`

18. [ ] **Avaliar DraggableModal e ResponsiveDialog**
    - Decidir se mantém ou substitui por BaseModal
    - Se mantiver, refatorar para usar Bootstrap Modal internamente

19. [ ] **Padronizar todos os modais**
    - Verificar se todos usam BaseModal ou DraggableModal/ResponsiveDialog
    - Padronizar API

### Fase 6: Refinamento e Otimização (Semana 7)

**Prioridade:** 🟢 BAIXA

20. [ ] **Substituir spinners nativos por componente Spinner**
    - [ ] `src/components/tables/Table.tsx`
    - [ ] `src/components/pages/Dashboard.tsx`
    - [ ] Demais arquivos

21. [ ] **Padronizar cores usando variáveis Bootstrap**
    - [ ] Criar `bootstrap-custom.scss`
    - [ ] Definir variáveis customizadas
    - [ ] Substituir valores hardcoded

22. [ ] **Otimizar Dashboard**
    - Usar componente Card quando disponível
    - Verificar performance

23. [ ] **Revisão final**
    - Verificar se não há estilos inline restantes
    - Verificar se não há alerts/confirms restantes
    - Testar em mobile, tablet e desktop
    - Testar tema claro e escuro

### Fase 7: Testes e Documentação (Semana 8)

**Prioridade:** 🟢 BAIXA

24. [ ] **Testes**
    - [ ] Testes em Chrome, Firefox, Safari
    - [ ] Testes em mobile (iOS e Android)
    - [ ] Testes de acessibilidade
    - [ ] Testes de performance

25. [ ] **Documentação**
    - [ ] Documentar componentes novos
    - [ ] Atualizar README se necessário
    - [ ] Criar guia de estilo (se necessário)

---

## 5. Checklist de Qualidade

Antes de considerar a refatoração completa, verificar:

### 5.1 Funcionalidades

- [ ] Modo claro/escuro funciona em todas as páginas
- [ ] Layout responsivo em mobile/tablet/desktop
- [ ] Todas as notificações usando sistema centralizado
- [ ] Todos os confirms usando ConfirmModal
- [ ] Todos os alerts substituídos por notificações
- [ ] Todos os botões usando componente Button (quando aplicável)
- [ ] Todos os formulários usando componentes padronizados
- [ ] Todas as tabelas ordenáveis e responsivas
- [ ] Todos os modais usando Bootstrap ou wrappers padronizados

### 5.2 Código

- [ ] Zero estilos inline (`style={}`)
- [ ] Zero `window.confirm()` nativos
- [ ] Zero `alert()` nativos
- [ ] Zero estilos duplicados
- [ ] CSS modularizado em arquivos SCSS organizados
- [ ] TypeScript sem erros
- [ ] ESLint sem erros
- [ ] Build sem warnings

### 5.3 Performance

- [ ] Bundle size não aumentou significativamente
- [ ] Tempo de carregamento aceitável
- [ ] Animações suaves (60fps)
- [ ] Lazy loading funcionando

### 5.4 Acessibilidade

- [ ] Todos os botões têm `aria-label` quando necessário
- [ ] Modais gerenciam foco corretamente
- [ ] Navegação por teclado funciona
- [ ] Contraste de cores adequado (WCAG AA)

### 5.5 Design

- [ ] Visual consistente em todas as páginas
- [ ] Espaçamentos padronizados (usando classes Bootstrap)
- [ ] Cores padronizadas (usando variáveis)
- [ ] Tipografia consistente

---

## 6. Melhorias Futuras (Opcional)

### 6.1 Testes

- [ ] Testes unitários (Jest + React Testing Library)
- [ ] Testes de integração
- [ ] Testes E2E (Cypress ou Playwright)

### 6.2 Documentação de Componentes

- [ ] Storybook para componentes
- [ ] Documentação de props e exemplos de uso

### 6.3 Internacionalização (i18n)

- [ ] Implementar react-i18next
- [ ] Traduzir todas as strings
- [ ] Suporte a múltiplos idiomas

### 6.4 PWA (Progressive Web App)

- [ ] Service Worker
- [ ] Manifest.json completo
- [ ] Offline support
- [ ] Install prompt

### 6.5 Otimizações Avançadas

- [ ] Code splitting mais agressivo
- [ ] Image optimization
- [ ] Font optimization
- [ ] Bundle analysis e otimização

---

## 7. Observações Importantes

### 7.1 O que NÃO Precisa Mudar

✅ **Manter como está:**
- Sistema de notificações (`NotificationProvider`) - já está perfeito
- Componente Table - já está bem implementado
- Dashboard com Recharts - já está profissional
- Estrutura de pastas - já está bem organizada
- TypeScript - já está bem tipado
- React Query - já está bem configurado
- Layout responsivo - já funciona bem

### 7.2 Decisões Arquiteturais

⚠️ **Avaliar:**
- `DraggableModal` vs Bootstrap Modal - decidir se mantém ou substitui
- `ResponsiveDialog` - mesma questão acima
- Se mantiver, refatorar para usar Bootstrap Modal internamente

### 7.3 Prioridades Reais

1. **CRÍTICO:** Remover estilos inline (268 ocorrências) - afeta manutenibilidade
2. **ALTA:** Substituir alerts/confirms (34 ocorrências) - afeta UX
3. **MÉDIA:** Modularizar CSS - afeta organização
4. **BAIXA:** Criar componentes faltantes - nice to have
5. **BAIXA:** Otimizações - melhorias incrementais

### 7.4 Tempo Estimado

- **Fase 1-2:** 2 semanas (fundação + alerts/confirms)
- **Fase 3:** 1 semana (modularizar CSS)
- **Fase 4:** 2 semanas (remover estilos inline)
- **Fase 5:** 1 semana (padronizar modais)
- **Fase 6:** 1 semana (refinamento)
- **Fase 7:** 1 semana (testes e documentação)

**Total:** ~8 semanas trabalhando exclusivamente na refatoração

**Realista:** Considerando desenvolvimento paralelo, estimar 12-16 semanas

---

## 8. Comandos Úteis

### 8.1 Buscar Estilos Inline

```bash
# Buscar todos os estilos inline
grep -r "style={" frontend/src --include="*.tsx" | wc -l

# Listar arquivos com estilos inline
grep -r "style={" frontend/src --include="*.tsx" -l | sort | uniq
```

### 8.2 Buscar Alerts e Confirms

```bash
# Buscar alerts
grep -r "alert(" frontend/src --include="*.tsx" -i

# Buscar confirms
grep -r "confirm(" frontend/src --include="*.tsx" -i
```

### 8.3 Instalar Dependências

```bash
# SASS
npm install sass --save-dev

# Bootstrap JS (se necessário para modais)
npm install bootstrap --save
```

### 8.4 Build e Testes

```bash
# Build de desenvolvimento
npm run dev

# Build de produção
npm run build

# Lint
npm run lint

# Lint com fix automático
npm run lint:fix
```

---

## 9. Conclusão

Este documento lista todas as mudanças necessárias para modernizar o frontend do BackNet ERP. O projeto já está em uma base sólida com:

✅ Bootstrap 5 instalado  
✅ Sistema de tema implementado  
✅ Sistema de notificações centralizado  
✅ Componentes UI básicos  
✅ Tabelas reutilizáveis  
✅ Layout responsivo  

As principais melhorias são:

🔴 **Remover 268 estilos inline** - maior impacto na manutenibilidade  
🔴 **Substituir 34 alerts/confirms nativos** - melhor UX  
🟡 **Modularizar CSS** - melhor organização  
🟢 **Criar componentes faltantes** - completar biblioteca  

**Recomendação:**  
Focar nas fases 1-4 primeiro (remover estilos inline e substituir alerts/confirms), pois têm maior impacto. As fases 5-7 podem ser feitas incrementalmente.

---

**Documento criado em:** 2024  
**Última atualização:** 2024  
**Versão:** 1.0
