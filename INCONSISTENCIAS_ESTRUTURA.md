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

**Status**: ✅ **EM REFATORAÇÃO** - Path aliases configurados e sendo aplicados gradualmente.

**Solução**: ✅ Path aliases configurados e funcionando:

**1. TypeScript (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"],
      "@/components/*": ["components/*"],
      "@/utils/*": ["utils/*"],
      "@/constants/*": ["constants/*"]
    }
  }
}
```

**2. Webpack (`craco.config.js`):**
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

**3. Scripts (`package.json`):**
- `dev`: `craco start` (em vez de `react-scripts start`)
- `build`: `craco build` (em vez de `react-scripts build`)
- `test`: `craco test` (em vez de `react-scripts test`)

**Dependência necessária:**
- `@craco/craco`: ^7.1.0 (instalado como devDependency)

**Arquivos Refatorados**:
- ✅ `FinanceiroModal.tsx`
- ✅ `BancoListModal.tsx`
- ✅ `PlanoListModal.tsx`
- ✅ `ContratoModal.tsx`
- ✅ `ContratoListModal.tsx`
- ✅ `TituloModal.tsx`
- ✅ `ClienteListModal.tsx`
- ✅ `ClienteModal.tsx`
- ✅ `ParametrosModal.tsx`
- ✅ `TermosTab.tsx`
- ✅ `TermoEditModal.tsx`

**Uso:**
```typescript
// Antes
import { useTitulosFinanceiro } from '../../../hooks/useTitulosFinanceiro';

// Depois
import { useTitulosFinanceiro } from '@/hooks/useTitulosFinanceiro';
```

**Observação**: A refatoração pode continuar gradualmente nos demais arquivos conforme necessário.

**Estatísticas:**
- ✅ 11 arquivos principais refatorados
- ⏳ ~57 arquivos ainda com imports profundos (`../../../` ou `../../../../`)
- 📊 Total de imports profundos encontrados: ~168 ocorrências

---

### Configuração do ESLint

**Status**: ✅ **CONFIGURADO** - ESLint configurado para suportar regras TypeScript.

**Configuração aplicada:**
- ✅ Adicionado `parser: "@typescript-eslint/parser"` ao `.eslintrc.json`
- ✅ Adicionado `parserOptions.project` apontando para `tsconfig.json`
- ✅ Permite que regras TypeScript ESLint (como `@typescript-eslint/naming-convention`) funcionem corretamente

**Arquivo:** `frontend/.eslintrc.json`

---

## 🔧 Ações Recomendadas

### Status das Correções

1. ✅ **Renomear services inconsistentes** - **CONCLUÍDO**:
   - ✅ `ContratoService.ts` → `contratoService.ts`
   - ✅ `TermoContratoService.ts` → `termoContratoService.ts`
   - ✅ Todos os imports atualizados (8 arquivos)

2. ✅ **Configurar path aliases** - **CONCLUÍDO**:
   - ✅ Paths adicionados no `tsconfig.json` do frontend (`@/*`, `@/components/*`, `@/hooks/*`, etc.)
   - ✅ Configurado CRACO (`craco.config.js`) para webpack resolver os aliases corretamente
   - ✅ Scripts do `package.json` atualizados para usar `craco` em vez de `react-scripts`
   - ✅ Refatorados 11 arquivos principais de modais para usar path aliases
   - ⏳ Ainda existem ~57 arquivos com imports profundos que podem ser refatorados gradualmente
   - ⏳ Atualização gradual dos demais arquivos pode continuar conforme necessário

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
**Versão:** 2.0

---

## 📝 Notas Técnicas

### CRACO vs React Scripts

O projeto usa **CRACO** (Create React App Configuration Override) para permitir customização do webpack sem fazer `eject` do Create React App. Isso foi necessário para:

1. **Resolver path aliases no webpack**: O TypeScript entende os aliases do `tsconfig.json`, mas o webpack precisa de configuração adicional através do CRACO.

2. **Manter compatibilidade**: O CRACO permite manter todas as funcionalidades do `react-scripts` enquanto adiciona customizações necessárias.

3. **Evitar eject**: Fazer `eject` tornaria o projeto mais difícil de manter e atualizar.

### Comandos Importantes

- **Desenvolvimento**: `npm run dev` (usa `craco start`)
- **Build**: `npm run build` (usa `craco build`)
- **Produção**: `npm start` (usa `node server.js` - serve arquivos estáticos)

⚠️ **Importante**: Sempre use `npm run dev` para desenvolvimento, não `react-scripts start` diretamente, pois isso não aplicará as configurações do CRACO.

