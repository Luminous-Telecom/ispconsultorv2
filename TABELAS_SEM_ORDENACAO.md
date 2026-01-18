# Tabelas Sem Ordenação

Este documento lista todas as tabelas do projeto que **não possuem ordenação configurada** (ou que têm colunas `sortable: true` mas não têm o handler `onSort` configurado).

## ❌ Tabelas Sem Ordenação

### 1. DashboardSearchResult
**Arquivo:** `frontend/src/components/dashboard/DashboardSearchResult.tsx`

**Problema:** 
- Colunas têm `sortable: true` definido, mas o componente `Table` não tem a prop `onSort` configurada
- As colunas ID, CNPJ, Razão Social, Nome Fantasia, Email e Status não são ordenáveis

**Linhas relevantes:**
- Linha 30, 37, 47, 55, 63, 79, 90: Colunas com `sortable: true`
- Linha 116-157: Componente Table sem `onSort`

**Solução sugerida:**
Adicionar `onSort` handler e configurar ordenação no backend através do hook `useClientes`.

---

## ⚠️ Observações

### FinanceiroModal
**Arquivo:** `frontend/src/components/modals/financeiro/FinanceiroModal.tsx`

**Status:** ⚠️ Configuração inconsistente
- Linha 829: `sortable: false` na config
- Linha 887-890: Tem `onSort` handler configurado

**Nota:** Apesar de ter `sortable: false` na config, possui `onSort` implementado. Verificar se está funcionando corretamente.

---

## ✅ Tabelas Com Ordenação (Referência)

As seguintes tabelas **possuem ordenação configurada corretamente**:

1. ✅ ClienteListModal - `sortColumn`, `sortDirection`, `onSortChange`
2. ✅ PlanoListModal - `sortColumn`, `sortDirection`, `onSortChange`
3. ✅ BancoListModal - `sortColumn`, `sortDirection`, `onSortChange`
4. ✅ ContratoListModal - `sortColumn`, `sortDirection`, `onSort`
5. ✅ FornecedorListModal - `sortColumn`, `sortDirection`, `onSortChange`
6. ✅ NotaFiscalListModal - `sortColumn`, `sortDirection`, `onSortChange`
7. ✅ ContasPagarListModal - `sortColumn`, `sortDirection`, `onSortChange`
8. ✅ UsuariosModal - `sortColumn`, `sortDirection`, `onSort`
9. ✅ AuditoriaModal - `sortColumn`, `sortDirection`, `onSortChange`
10. ✅ AgendadorTarefasModal - `sortColumn`, `sortDirection`
11. ✅ ContratosTab (ClienteModal) - `sortColumn`, `sortDirection`, `onSort`
12. ✅ FinanceiroTab (ClienteModal) - `sortColumn`, `sortDirection`, `onSort`
13. ✅ FinanceiroTab (ContratoModal) - `sortColumn`, `sortDirection`, `onSort`
14. ✅ FinanceiroAvulsoTab - `sortColumn`, `sortDirection`, `onSort`
15. ✅ TermosTab - `sortColumn`, `sortDirection`, `onSort`
16. ✅ LogsModal - `onSort` (ordenação local)

---

## 📋 Checklist para Implementar Ordenação

Para implementar ordenação em uma tabela, certifique-se de:

1. ✅ Configurar `sortable: true` nas colunas desejadas
2. ✅ Implementar handler `onSort` no componente Table
3. ✅ Passar `sortColumn` e `sortDirection` para o componente Table
4. ✅ Integrar com `useTableFilters` ou similar para gerenciar estado
5. ✅ Passar `sortColumn` e `sortDirection` para a API/Service que busca os dados
6. ✅ Implementar ordenação no backend (preferencial) ou frontend (apenas se necessário)

---

**Última atualização:** Gerado automaticamente pela análise do código
**Data:** $(date)
