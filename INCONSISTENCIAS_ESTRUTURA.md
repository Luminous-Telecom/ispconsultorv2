# Inconsistências de Estrutura Identificadas

Este documento lista inconsistências encontradas na estrutura de arquivos do projeto que podem ser corrigidas no futuro.

## 📋 Inconsistências Encontradas

### Frontend - Services

#### Nomenclatura Inconsistente

**Problema**: Alguns services estão em `PascalCase` enquanto outros estão em `camelCase`.

**Arquivos em PascalCase:**
- ~~`ContratoService.ts`~~ ✅ **CORRIGIDO** → `contratoService.ts`
- ~~`TermoContratoService.ts`~~ ✅ **CORRIGIDO** → `termoContratoService.ts`

**Arquivos em camelCase (correto):**
- `clienteService.ts` ✅
- `planoService.ts` ✅
- `bancoService.ts` ✅
- `tituloService.ts` ✅
- `authService.ts` ✅
- `dashboardService.ts` ✅
- `contratoService.ts` ✅
- `termoContratoService.ts` ✅

**Status**: ✅ **RESOLVIDO** - Todos os services agora seguem o padrão `camelCase`.

---

### Backend - Services

#### Nomenclatura Inconsistente

**Problema**: Alguns services podem ter nomenclatura inconsistente.

**Verificar:**
- Todos os services devem estar em `PascalCase` (padrão do backend)
- Verificar se há duplicações (ex: `parametroService.ts` vs `parametrosService.ts`)

---

### Imports com Caminhos Profundos

**Problema**: Alguns arquivos têm imports com muitos níveis (`../../../`).

**Exemplo encontrado:**
```typescript
// frontend/src/components/modals/financeiro/FinanceiroModal.tsx
import { useTitulosFinanceiro } from '../../../hooks/useTitulosFinanceiro';
import { Titulo, TituloFilters } from '../../../types';
import { useNotificationContext } from '../../../components/notifications/NotificationProvider';
```

**Solução**: Considerar usar path aliases no `tsconfig.json` para simplificar imports.

**Sugestão de path aliases:**
```json
{
  "compilerOptions": {
    "paths": {
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

**Uso:**
```typescript
// Antes
import { useTitulosFinanceiro } from '../../../hooks/useTitulosFinanceiro';

// Depois
import { useTitulosFinanceiro } from '@hooks/useTitulosFinanceiro';
```

---

## 🔧 Ações Recomendadas

### Status das Correções

1. ✅ **Renomear services inconsistentes** - **CONCLUÍDO**:
   - ✅ `ContratoService.ts` → `contratoService.ts`
   - ✅ `TermoContratoService.ts` → `termoContratoService.ts`
   - ✅ Todos os imports atualizados (8 arquivos)

2. ✅ **Configurar path aliases** - **CONCLUÍDO**:
   - ✅ Paths adicionados no `tsconfig.json` do frontend (`@/*`, `@/components/*`, `@/hooks/*`, etc.)
   - ⏳ Atualização gradual de imports pode ser feita conforme necessário

3. ✅ **Verificar duplicações** - **VERIFICADO**:
   - `parametroService.ts` e `parametrosService.ts` são services diferentes:
     - `parametroService.ts`: Parâmetros individuais (chave-valor) - não está sendo usado
     - `parametrosService.ts`: Parâmetros gerais do sistema (validar_cpf_cnpj, etc.) - em uso
   - Não há duplicação, são propósitos diferentes

---

## ⚠️ Nota Importante

Estas inconsistências **não afetam a funcionalidade** do código, mas podem ser corrigidas para melhorar a consistência e manutenibilidade do projeto.

A correção pode ser feita gradualmente, arquivo por arquivo, testando após cada mudança.

---

**Última atualização:** 2025-01-22
**Versão:** 1.0

