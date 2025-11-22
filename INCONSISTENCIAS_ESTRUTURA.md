# Inconsistências de Estrutura Identificadas

Este documento lista inconsistências encontradas na estrutura de arquivos do projeto que podem ser corrigidas no futuro.

## 📋 Inconsistências Encontradas

### Imports com Caminhos Profundos

**Status**: ✅ **RESOLVIDO** - Todos os imports profundos refatorados para usar path aliases.

**Solução implementada:**
- ✅ Path aliases configurados no `tsconfig.json` e `craco.config.js`
- ✅ Webpack configurado para resolver aliases através do CRACO
- ✅ Scripts atualizados para usar `craco` em vez de `react-scripts`
- ✅ ESLint configurado com `parserOptions.project` para suportar regras TypeScript
- ✅ **71 arquivos refatorados** (todos os imports profundos eliminados)

**Estatísticas:**
- ✅ **Todos os imports profundos refatorados** (`../../../../` eliminados)
- ✅ Imports agora usam path aliases:
  - `@/hooks` - hooks personalizados
  - `@/services` - serviços de API
  - `@/types` - tipos TypeScript
  - `@/utils` - utilitários
  - `@/components/ui` - componentes UI
  - `@/components/common` - componentes comuns
  - `@/components/tables` - componentes de tabela
  - `@/components/forms` - componentes de formulário

---

## ⚠️ Nota Importante

Estas inconsistências **não afetam a funcionalidade** do código, mas podem ser corrigidas para melhorar a consistência e manutenibilidade do projeto.

A correção pode ser feita gradualmente, arquivo por arquivo, testando após cada mudança.

---

**Última atualização:** 2025-01-22
**Versão:** 3.0

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
