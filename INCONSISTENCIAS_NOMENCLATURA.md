# Inconsistências de Nomenclatura Identificadas

Este documento lista inconsistências encontradas no código que não seguem as convenções definidas em `CONVENCOES_NOMENCLATURA.md`.

## 🔴 Inconsistências Críticas

### 1. Interface com Prefixo "I"

**Problema**: Interface usando prefixo `I`, violando a convenção que proíbe prefixos em interfaces.

**Localização**: `backend/src/services/variable-handlers/types.ts`

**Código Atual**:
```typescript
export interface IVariableHandler {
  process(conteudo: string, context: VariableContext): Promise<string> | string;
  canProcess(conteudo: string): boolean;
  getVariaveisDisponiveis(): GrupoVariaveis;
}
```

**Correção Necessária**:
```typescript
export interface VariableHandler {
  process(conteudo: string, context: VariableContext): Promise<string> | string;
  canProcess(conteudo: string): boolean;
  getVariaveisDisponiveis(): GrupoVariaveis;
}
```

**Arquivos Afetados**:
- `backend/src/services/variable-handlers/types.ts` (definição)
- `backend/src/services/VariaveisDocumentoService.ts` (import e uso)
- `backend/src/services/variable-handlers/ClienteVariableHandler.ts`
- `backend/src/services/variable-handlers/ContratoVariableHandler.ts`
- `backend/src/services/variable-handlers/TituloVariableHandler.ts`
- `backend/src/services/variable-handlers/FinanceiroVariableHandler.ts`
- `backend/src/services/variable-handlers/SistemaVariableHandler.ts`
- `backend/src/services/variable-handlers/EmpresaVariableHandler.ts`

**Impacto**: ⚠️ **ALTO** - Requer refatoração em múltiplos arquivos

---

### 2. DTOs com Sufixo "DTO"

**Problema**: Interfaces usando sufixo `DTO` em vez de `Data`, violando a convenção que especifica usar prefixo `Create`/`Update` ou sufixo `Data`.

**Localização**: `frontend/src/types/entities.ts`

**Código Atual**:
```typescript
export interface CreateTituloDTO { ... }
export interface UpdateTituloDTO extends Partial<CreateTituloDTO> { ... }
export interface CreateContratoDTO { ... }
export interface UpdateContratoDTO extends Partial<CreateContratoDTO> { ... }
```

**Correção Necessária**:
```typescript
export interface CreateTituloData { ... }
export interface UpdateTituloData extends Partial<CreateTituloData> { ... }
export interface CreateContratoData { ... }
export interface UpdateContratoData extends Partial<CreateContratoData> { ... }
```

**Observação**: Já existe `CreateContratoData` em `frontend/src/hooks/useContratos.ts`, indicando inconsistência no projeto.

**Arquivos Afetados**:
- `frontend/src/types/entities.ts` (definição)
- `frontend/src/types/index.ts` (documentação e exportação)
- Todos os arquivos que importam esses tipos

**Impacto**: ⚠️ **MÉDIO** - Requer atualização de imports e pode quebrar código existente

---

## 📋 Resumo das Ações Necessárias

### Prioridade Alta

1. **Renomear `IVariableHandler` para `VariableHandler`**
   - Atualizar definição em `types.ts`
   - Atualizar todos os imports e implementações
   - Atualizar documentação

### Prioridade Média

2. **Renomear DTOs para Data**
   - `CreateTituloDTO` → `CreateTituloData`
   - `UpdateTituloDTO` → `UpdateTituloData`
   - `CreateContratoDTO` → `CreateContratoData`
   - `UpdateContratoDTO` → `UpdateContratoData`
   - Verificar e consolidar com `CreateContratoData` existente em `useContratos.ts`
   - Atualizar todos os imports

---

## ✅ Verificações Realizadas

- ✅ Nenhuma interface com prefixo `I` encontrada no frontend
- ✅ Nenhuma classe em camelCase encontrada
- ✅ Nenhuma variável em PascalCase encontrada
- ✅ Nenhuma função em PascalCase encontrada
- ✅ Componentes seguem PascalCase
- ✅ Hooks seguem camelCase com prefixo `use`
- ✅ Services seguem camelCase (frontend) e PascalCase (backend)

---

**Última atualização:** 2025-01-22  
**Status**: ⚠️ **2 inconsistências identificadas**

