# Inconsistências de Estrutura Identificadas

Este documento lista inconsistências encontradas na estrutura de arquivos do projeto que podem ser corrigidas no futuro.

## 📋 Inconsistências Encontradas

*Nenhuma inconsistência pendente no momento.*

**Refatorações concluídas:**
- ✅ **Todos os imports relativos profundos eliminados** (`../../../../`, `../../../`, `../../`)
- ✅ **106 arquivos refatorados** no total
- ✅ Todos os imports críticos agora usam path aliases:
  - `@/hooks` - hooks personalizados
  - `@/services` - serviços de API
  - `@/types` - tipos TypeScript
  - `@/utils` - utilitários
  - `@/components/*` - componentes (ui, common, tables, forms, modals, etc.)
  - `@/contexts` - contextos React
  - `@/config` - configurações
  - `@/schemas` - schemas de validação
  - `@/constants` - constantes

**Resultado:**
- ✅ 0 imports relativos profundos restantes
- ✅ Código mais legível e manutenível
- ✅ Imports consistentes em todo o projeto

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

---

**Última atualização:** 2025-01-22
**Versão:** 6.0
