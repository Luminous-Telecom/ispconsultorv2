# Centralização de Componentes — BackNet Frontend

Documento de inventário e roadmap para reduzir duplicação no frontend React.

**Última revisão:** maio/2026  
**Escopo:** `frontend/src/components`, hooks e contexts relacionados.

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Infraestrutura já existente](#infraestrutura-já-existente)
3. [Modais de listagem (*ListModal*)](#1-modais-de-listagem-listmodal)
4. [Pares ERP × SaaS](#2-pares-erp--saas)
5. [Blockdomi (IPv4 / IPv6 / Domínio)](#3-blockdomi-ipv4--ipv6--domínio)
6. [Logs](#4-logs)
7. [Formulários de entidade](#5-formulários-de-entidade)
8. [Botões e UI](#6-botões-e-ui)
9. [Layout e páginas grandes](#7-layout-e-páginas-grandes)
10. [Hooks reutilizáveis (padrões repetidos)](#8-hooks-reutilizáveis-padrões-repetidos)
11. [O que não centralizar](#o-que-não-centralizar)
12. [Prioridade sugerida](#prioridade-sugerida)
13. [Checklist por arquivo](#checklist-por-arquivo)

---

## Visão geral

O projeto já possui camadas compartilhadas (`components/ui`, `components/common`, `components/tables`, hooks como `useTableFilters` e `useModalSelect`), mas **dezenas de modais reimplementam o mesmo fluxo** em vez de compor essas peças.

| Métrica | Valor aproximado |
|--------|------------------|
| Arquivos `.tsx` em `components/` | ~248 |
| Modais `*ListModal` migrados (Fase 1) | **27** |
| Modais SaaS espelhando ERP | ~23 |
| `ListModal` genérico em uso | **27 modais** |
| Pares ERP/SaaS duplicados | ~12 |

---

## Infraestrutura já existente

Use como base antes de criar componentes novos.

### Novidades (Fase 1 — concluída)

| Recurso | Caminho | Descrição |
|---------|---------|-----------|
| `useEntityListModal` | `hooks/useEntityListModal.ts` | Filtros, seleção, bulk CRUD/seleção, paginação, auditoria |
| `normalizeListPagination` | `utils/pagination.ts` | Paginação ERP/SaaS → formato `Table` |
| `ListModal` | `components/common/ListModal.tsx` | Table + DraggableModal; `onRowClick`, `modalId`, `modalSize`, `wrapperTitle`, `onSelectAllPages`, `customControlsAfterActions` |

### Novidades (Fase 2 — em andamento)

| Recurso | Caminho | Variantes |
|---------|---------|-----------|
| `NFSeConfigSectionCore` | `modals/nfse/` | `erp` \| `saas` |
| `NFSeModalCore` | `modals/nfse/` | `erp` \| `saas` |
| `RecursosSistemaModalCore` | `modals/recursos/` | `erp` \| `saas` |
| `ReceberModalCore` | `modals/receber/` | `erp` \| `saas` |
| `SaasServidorListModalCore` | `modals/servidor/` | `email` \| `whatsapp` |

**27 modais de listagem** usam `ListModal`; a maioria compõe `useEntityListModal` (RPKI e casos especiais usam `useTableFilters` + bulk próprio).

| Recurso | Caminho | Uso atual |
|---------|---------|-----------|
| `ListModal` | `components/common/ListModal.tsx` | **Adotado** por todos os `*ListModal` e listas SaaS/RPKI migrados |
| `useListModal` | `hooks/useListModal.ts` | Estado open/close/config; pouco adotado |
| `DraggableModal` | `components/common/DraggableModal.tsx` | Padrão obrigatório para modais |
| `Table` | `components/tables/Table.tsx` | Listagens principais |
| `DataTable` | `components/tables/DataTable.tsx` | Quase sem uso (preferir `Table`) |
| `useTableFilters` | `hooks/useTableFilters.ts` | Paginação, busca, sort |
| `useModalSelect` | `hooks/useModalSelect.ts` | Seleção em modais |
| `useBulkBtn` | `components/ui` | Labels/variantes de bulk actions |
| Botões do sistema | `components/ui/buttons/buttons.tsx` | Novo, Editar, Salvar, etc. |
| `ModalFormActions` | `components/ui/buttons/ModalFormActions.tsx` | Salvar/Cancelar em forms |
| `AddressFields` / `ContactFields` | `components/forms/` | Poucos consumidores |
| `logsModalRegistry` | `modals/logs/logsModalRegistry.ts` | **Bom exemplo** — ERP/SaaS em um modal |
| `SingleModalWrapper` | `components/common/SingleModalWrapper.tsx` | Registro central de modais no Layout |

Documentação de componentes UI: `frontend/src/components/README.md`.

---

## 1. Modais de listagem (*ListModal*)

### Problema

Cada `*ListModal` repete:

- `useTableFilters` + `useModalSelect` + `useBulkBtn` + `useAuditoria`
- `DraggableModal` + `Table` + prop `skipWrapper`
- Bulk actions: novo, editar, excluir, imprimir, selecionar
- `handleSearchChange` com `setTimeout(() => { tableFilters.setSearch... })`
- Sub-modais de create/edit (`showCreateModal`, `selectedId`)

O componente `ListModal` encapsula Table + DraggableModal + bulk + filtros. A Fase 1 migrou todos os modais de listagem identificados.

### Padrão de uso

```tsx
const list = useEntityListModal<T>({ onClose, onSelect: optional });
// data hook com list.tableFilters.*
const listModal = (
  <ListModal<T>
    show={show}
    onClose={list.handleModalClose}
    skipWrapper={skipWrapper}
    config={{ title, columns, searchFields, emptyMessage, multiSelect?: true }}
    data={rows}
    bulkActions={onSelect ? list.buildSelectBulkActions() : list.buildCrudBulkActions({ onNew, onEdit, onDelete })}
    pagination={list.buildPagination(api?.pagination)}
    onSelectAllPages={optional}
    ...
  />
);
return <>{listModal}{auxiliaryModals}</>;
```

Modais RPKI usam `skipWrapper` (wrapper no `SingleModalWrapper`). Modais complexos podem manter JSX extra (resumo, filtros) fora do `ListModal`.

### Status da migração (Fase 1)

| Status | Arquivos |
|:------:|----------|
| ✅ | ERP: `Banco`, `Fornecedor`, `Plano`, `Cliente`, `Agent`, `TipoCobranca`, `Contrato`, `ContasPagar`, `ContasReceber`, `NotaFiscal` |
| ✅ | Blockdomi: `IPv4`, `IPv6`, `Dominio`, `IpsPermitidos` |
| ✅ | RPKI: `RpkiCa`, `RpkiAspa`, `RpkiRoa`, `RpkiCaParent`, `RpkiRepository` |
| ✅ | SaaS listas: `SaasBancos`, `SaasClientes`, `SaasPlanoList`, `SaasTipoCobranca`, `SaasUsuarios` |
| ✅ | `SaasServidorEmailModal`, `SaasServidorWhatsappModal` → `SaasServidorListModalCore` (listagem SaaS) |

### Modais SaaS com padrão de listagem (sem sufixo ListModal)

| Arquivo | Equivalente ERP |
|---------|-----------------|
| `SaasServidorEmailModal.tsx` | `ServidorEmailModal` (estrutura diferente — abas) |
| `SaasServidorWhatsappModal.tsx` | `ServidorWhatsappModal` |

---

## 2. Pares ERP × SaaS

Duplicação quase 1:1. Modelo de referência: `logsModalRegistry.ts` + `modals/logs/LogsModal.tsx` (variante `erp` | `saas`).

### Configuração e parâmetros

| ERP | SaaS | Caminho ERP | Caminho SaaS | Estratégia |
|-----|------|-------------|--------------|------------|
| `NFSeConfigSection` | `SaasNFSeConfigSection` | `modals/parametros/NFSeConfigSection.tsx` | `modals/saas/SaasNFSeConfigSection.tsx` | Um componente + `variant` + service injetado |
| `NFSeModal` | `SaasNfseModal` | `modals/parametros/NFSeModal.tsx` | `modals/saas/SaasNfseModal.tsx` | Wrapper fino sobre seção unificada |
| `RecursosSistemaModal` | `SaasRecursosSistemaModal` | `modals/parametros/RecursosSistemaModal.tsx` | `modals/saas/SaasRecursosSistemaModal.tsx` | Form compartilhado; campos extras SaaS via config |
| `ParametrosModal` | — | `modals/parametros/ParametrosModal.tsx` | — | Avaliar se SaaS precisa equivalente |

### Servidores de comunicação

| ERP | SaaS | Abas duplicadas |
|-----|------|-----------------|
| `ServidorEmailModal` | `SaasServidorEmailModal` | `servidor-email/abas/ServidorTab` vs `servidor-whatsapp/abas/ServidorTab` (estrutura similar) |
| `ServidorWhatsappModal` | `SaasServidorWhatsappModal` | Idem |
| — | `SaasServidorEmailFormModal` | Form isolado SaaS |
| — | `SaasServidorWhatsappFormModal` | Form isolado SaaS |

**Abas candidatas a unificação:**

| Aba | ERP Email | ERP WhatsApp | Proposta |
|-----|-----------|--------------|----------|
| `ServidorTab` | `parametros/servidor-email/abas/ServidorTab.tsx` | `parametros/servidor-whatsapp/abas/ServidorTab.tsx` | `ServidorConnectionTab` com props `channel: 'email' \| 'whatsapp'` |
| `MensagensTab` | `servidor-email/abas/MensagensTab.tsx` | `servidor-whatsapp/abas/MensagensTab.tsx` | `MensagensConfigTab` compartilhado |
| `TemplatesTab` | WhatsApp only | — | Manter específico |
| `TemplatesMetaTab` | WhatsApp only | — | Manter específico |

### Cadastros e financeiro

| ERP | SaaS | Observação |
|-----|------|------------|
| `BancoListModal` + `BancoModal` | `SaasBancosModal` + `SaasBancoFormModal` | List + form |
| `ClienteListModal` + `ClienteModal` | `SaasClientesModal` | |
| `PlanoListModal` + `PlanoModal` | `SaasPlanoListModal` + `SaasPlanoFormModal` | |
| `ReceberModal` | `SaasReceberModal` | `modals/pagamentos/` vs `modals/saas/` |
| `UsuarioFormModal` + `UsuariosModal` | `SaasUsuarioFormModal` + `SaasUsuariosModal` | |
| — | `SaasTenantUsuarioFormModal` | Específico multi-tenant |
| `ContratoModal` | `SaasContratoFormModal` | Alta complexidade — unificar trechos |
| `AgendadorTarefasModal` | `SaasAgendadorTarefasModal` | |
| `RotinaAgendadaModal` | `SaasRotinaAgendadaModal` | |
| `DadosEmpresaModal` | `SaasDadosEmpresaModal` / `SaasEmpresaFormModal` | |
| — | `SaasTituloFormModal` | |
| — | `SaasReceberModal` | |

### Lista completa de modais SaaS (`components/modals/saas/`)

| Arquivo | Centralizar com |
|---------|-----------------|
| `SaasAgendadorTarefasModal.tsx` | `AgendadorTarefasModal` |
| `SaasBancoFormModal.tsx` | `BancoModal` |
| `SaasBancosModal.tsx` | `BancoListModal` |
| `SaasClientesModal.tsx` | `ClienteListModal` |
| `SaasContratoFormModal.tsx` | `ContratoModal` (parcial) |
| `SaasDadosEmpresaModal.tsx` | `DadosEmpresaModal` |
| `SaasEmpresaFormModal.tsx` | `DadosEmpresaModal` / empresa |
| `SaasNfseModal.tsx` | `NFSeModal` |
| `SaasNFSeConfigSection.tsx` | `NFSeConfigSection` |
| `SaasPlanoFormModal.tsx` | `PlanoModal` |
| `SaasPlanoListModal.tsx` | `PlanoListModal` |
| `SaasReceberModal.tsx` | `ReceberModal` |
| `SaasRecursosSistemaModal.tsx` | `RecursosSistemaModal` |
| `SaasRotinaAgendadaModal.tsx` | `RotinaAgendadaModal` |
| `SaasServidorEmailFormModal.tsx` | `ServidorEmailModal` |
| `SaasServidorEmailModal.tsx` | `ServidorEmailModal` |
| `SaasServidorWhatsappFormModal.tsx` | `ServidorWhatsappModal` |
| `SaasServidorWhatsappModal.tsx` | `ServidorWhatsappModal` |
| `SaasTenantUsuarioFormModal.tsx` | `UsuarioFormModal` |
| `SaasTipoCobrancaFormModal.tsx` | `TipoCobrancaContratoModal` |
| `SaasTipoCobrancaModal.tsx` | `TipoCobrancaContratoListModal` |
| `SaasTituloFormModal.tsx` | `TituloModal` (parcial) |
| `SaasUsuarioFormModal.tsx` | `UsuarioFormModal` |
| `SaasUsuariosModal.tsx` | `UsuariosModal` |
| `saasTenantListTableConfig.tsx` | Config de tabela — manter como config |

---

## 3. Blockdomi (IPv4 / IPv6 / Domínio)

### Duplicação forte

| Arquivo | Linhas ~ | Diferença principal |
|---------|----------|---------------------|
| `IPv4ListModal.tsx` | 535 | `useIPv4s`, `IPv4Service`, `IPv4Modal` |
| `IPv6ListModal.tsx` | 535 | `useIPv6s`, `IPv6Service`, `IPv6Modal` |

**Proposta:** `BlockdomiIpListModal` genérico ou factory:

```ts
createBlockdomiIpListModal({ version: 4 | 6 })
```

### Relacionados

| Arquivo | Centralização |
|---------|---------------|
| `IPv4Modal.tsx` / `IPv6Modal.tsx` | Form compartilhado com validação por versão |
| `DominioListModal.tsx` | Mesmo padrão de listagem; bulk edit separado |
| `DominioModal.tsx` | |
| `DominioBulkEditModal.tsx` | |
| `IpsPermitidosListModal.tsx` | ListModal |
| `IpsPermitidoModal.tsx` | |
| `ImportarListaBlockdomiModal.tsx` | Específico — manter |
| `WhoisModal.tsx` | Específico — manter |
| `BlockdomiLogsRealModal.tsx` | Integrar ao registry de logs se possível |

---

## 4. Logs

### Já centralizado (manter como referência)

| Recurso | Caminho |
|---------|---------|
| Modal unificado ERP/SaaS | `modals/logs/LogsModal.tsx` |
| Registry de tipos | `modals/logs/logsModalRegistry.ts` |
| IDs no `ModalContext` | `logs-usuarios`, `saas-logs-email`, etc. |

### Ainda fragmentado — candidatos a merge no `LogsModal`

| Arquivo | Caminho |
|---------|---------|
| `RpkiRoaLogsModal.tsx` | `modals/logs/rpki/` |
| `RpkiAspaLogsModal.tsx` | `modals/logs/rpki/` |
| `RpkiValidationLogsModal.tsx` | `modals/logs/` |
| `RpkiRepositorioLogsModal.tsx` | `modals/logs/rpki/` |
| `RpkiCaPaiLogsModal.tsx` | `modals/logs/rpki/` |

**Proposta:** estender `LogsModalType` + `LOG_MODAL_BY_ID` com entradas RPKI.

### Colisão de nomes

| Arquivo | Responsabilidade | Ação sugerida |
|---------|------------------|---------------|
| `components/common/LogsModal.tsx` | Logs de **rotina** do agendador (`routineId`) | Renomear para `RotinaLogsModal.tsx` |
| `components/modals/logs/LogsModal.tsx` | Logs gerais do sistema (auditoria, email, etc.) | Manter nome |

### Outros modais de detalhe (compor, não duplicar listagem)

| Arquivo | Uso |
|---------|-----|
| `MensagemDetalhesModal.tsx` | Detalhe de mensagem |
| `AuditoriaDetalhesModal.tsx` | Detalhe de auditoria |
| `AuditoriaModal.tsx` | Listagem auditoria — candidato a ListModal |

---

## 5. Formulários de entidade

### Já centralizado

| Recurso | Caminho | Consumidores atuais |
|---------|---------|---------------------|
| `ModalFormActions` | `ui/buttons/ModalFormActions.tsx` | ~30 modais |
| `AddressFields` | `forms/AddressFields.tsx` | `EnderecoTab` (cliente, empresa), `SaasEmpresaFormModal` |
| `ContactFields` | `forms/ContactFields.tsx` | `ContatoTab`, empresa |
| `useFormReset` | `hooks/useFormReset.ts` | Vários forms |
| `useApiError` | `hooks/useApiError.ts` | Padrão de erro |

### Form modals com `ModalFormActions` (padronizar via hook futuro)

| Arquivo |
|---------|
| `BancoModal.tsx` |
| `PlanoModal.tsx` |
| `FornecedorModal.tsx` |
| `ClienteModal.tsx` |
| `ContaPagarModal.tsx` |
| `TipoCobrancaContratoModal.tsx` |
| `UsuarioFormModal.tsx` |
| `ParametrosModal.tsx` |
| `IPv4Modal.tsx` / `IPv6Modal.tsx` / `DominioModal.tsx` |
| `IpsPermitidoModal.tsx` |
| `SshDeviceModal.tsx` |
| `SaasBancoFormModal.tsx` |
| `SaasPlanoFormModal.tsx` |
| `SaasUsuarioFormModal.tsx` |
| `SaasTenantUsuarioFormModal.tsx` |
| `SaasTipoCobrancaFormModal.tsx` |
| `SaasServidorEmailFormModal.tsx` |
| `SaasServidorWhatsappFormModal.tsx` |
| `SaasTituloFormModal.tsx` |
| `SaasContratoFormModal.tsx` |
| `SaasEmpresaFormModal.tsx` |
| `ServicoAdicionalModal.tsx` |
| `TermoEditModal.tsx` |
| `AdicionarArquivoModal.tsx` |
| `DominioBulkEditModal.tsx` |
| `RotinaAgendadaModal.tsx` |

### Proposta: `useEntityFormModal`

Encapsular: `useFormReset`, mutate, `invalidateQueries`, `showApiError`, estados `errors`, integração com `ModalFormActions`.

### Expandir `AddressFields` / `ContactFields`

Formulários que ainda repetem campos de endereço/contato manualmente devem migrar para `components/forms/`.

---

## 6. Botões e UI

### Centralizado — usar sempre

| Recurso | Caminho |
|---------|---------|
| `Button` | `components/ui/Button.tsx` |
| Botões nomeados | `components/ui/buttons/buttons.tsx` |
| `SystemButton` / `useBulkBtn` | `components/ui/buttons/` |
| `Spinner`, `Badge`, `Input`, `Card` | `components/ui/` |

### Arquivos com `className="btn btn-*"` direto (migrar para `ui`)

| Arquivo | Observação |
|---------|------------|
| `pages/CentralAssinante.tsx` | Links estilizados |
| `layout/Layout.tsx` | Botão voltar sidebar |
| `pages/saas/SaasLayout.tsx` | Idem |
| `common/ResponsiveDialog.tsx` | Voltar / menu |
| `modals/blockdomi/ImportarListaBlockdomiModal.tsx` | Remover PDF, links |
| `modals/titulos/titulo/TituloModal.tsx` | Dropdown |
| `modals/parametros/AssinaturaDigitalModal.tsx` | Outline primary |
| `modals/parametros/servidor-email/abas/MensagensTab.tsx` | Radio labels como btn |
| `modals/parametros/servidor-whatsapp/abas/MensagensTab.tsx` | Idem |

### Regras do projeto (não quebrar na centralização)

- Botões **sem ícones**, exceto ações de Copiar.
- Texto **fixo** durante `isPending` (ex.: sempre "Salvar").
- Confirmações destrutivas: **`window.confirm()`** — não substituir por `ConfirmModal` sem decisão explícita.

---

## 7. Layout e páginas grandes

| Arquivo | Linhas ~ | Proposta |
|---------|----------|----------|
| `contexts/I18nContext.tsx` | 6407 | Extrair traduções para `i18n/pt/*.ts`, `i18n/en/*.ts` |
| `layout/Layout.tsx` | 1187 | Extrair `Sidebar`, `Header`, mapa de modais |
| `pages/CentralAssinante.tsx` | 1509 | Tabs/seções + hooks por domínio |
| `modals/clientes/contrato/ContratoModal.tsx` | muito grande | Hooks: plano, banco, títulos, termos |
| `modals/contas-receber/ContasReceberListModal.tsx` | 1317 | ListModal parcial + hooks de bulk |
| `modals/clientes/cliente/ClienteModal.tsx` | grande | Abas já existem — extrair lógica por aba |

### Modais complexos (centralizar só trechos)

| Arquivo | Motivo |
|---------|--------|
| `ContratoModal.tsx` | Múltiplas abas, integrações |
| `TituloModal.tsx` | Dropdown e fluxos financeiros |
| `ClienteModal.tsx` | SSH, RPKI, arquivos, contratos |
| `EmpresasModal.tsx` | Multi-empresa |
| `DadosEmpresaModal.tsx` | Abas empresa |
| `ServidorWhatsappModal.tsx` / `ServidorEmailModal.tsx` | Abas + Meta API |

---

## 8. Hooks reutilizáveis (padrões repetidos)

| Padrão repetido | Hook existente | Proposta |
|-----------------|----------------|----------|
| Filtros + paginação em tabela | `useTableFilters` | OK — usar em ListModal |
| Seleção em modal | `useModalSelect` | OK |
| Bulk button labels | `useBulkBtn` | OK |
| Erro de API | `useApiError` | OK |
| Auditoria | `useAuditoria` | OK |
| Bulk cliente | `useClienteBulkActions.ts` | Modelo para outros domínios |
| List modal state | `useListModal` | Adotar ou remover se morto |
| Search com setTimeout | inline em ~25 arquivos | Mover para `useTableFilters` ou ListModal |

### Arquivos com `setTimeout` em modais (candidatos a eliminar)

`DominioListModal`, `IPv4ListModal`, `IPv6ListModal`, `ContasReceberListModal`, `SaasUsuariosModal`, `SaasServidorWhatsappModal`, `SaasServidorEmailModal`, `SaasTipoCobrancaModal`, `SaasClientesModal`, `SaasBancosModal`, `AuditoriaModal`, `ContratoListModal`, `AgendadorTarefasModal`, `UsuariosModal`, `IpsPermitidosListModal`, `BancoListModal`, `FornecedorListModal`, `ClienteListModal`, `PlanoListModal`, `ContasPagarListModal`, `NotaFiscalListModal`, `LogsModal`, `SelecionarTermoModal`, `ModeloContratoSelectModal`, `BlockdomiLogsRealModal`, `RpkiKrillConfigModal`, `AtualizacoesModal`.

---

## O que não centralizar

| Item | Motivo |
|------|--------|
| `ConfirmModal` para delete | Regra do projeto: `window.confirm()` |
| `DataTable` como segundo padrão | Projeto usa `Table`; README menciona DataTable mas adoção é mínima |
| `ContratoListModal` / `ContasReceberListModal` inteiros | Regras de negócio densas — só extrair subpadrões |
| Modais muito específicos | `WhoisModal`, `ImportarListaBlockdomiModal`, terminais SSH/Agent |
| Lógica de domínio em componente genérico | Services e validações ficam por entidade |

---

## Prioridade sugerida

```
Fase 1 — ListModal + useEntityListModal ✅ (concluída)

Fase 2 — Pares ERP/SaaS (em andamento)
  └── NFSeConfigSection + modais NFS-e ✅
  └── RecursosSistemaModal
  └── ServidorTab + MensagensTab (email/whatsapp)

Fase 4 — Logs
  └── RPKI → logsModalRegistry
  └── Renomear common/LogsModal → RotinaLogsModal

Fase 5 — Forms
  └── useEntityFormModal
  └── Expandir AddressFields / ContactFields

Fase 6 — UI e estrutura
  └── Migrar btn cru → components/ui
  └── Fatiar I18nContext, Layout, CentralAssinante
```

---

## Checklist por arquivo

Legenda: `[ ]` pendente · `[~]` parcial · `[x]` já centralizado

### Listagem (Fase 1)

- [x] `BancoListModal.tsx`
- [x] `FornecedorListModal.tsx`
- [x] `PlanoListModal.tsx`
- [x] `ClienteListModal.tsx`
- [x] `AgentListModal.tsx`
- [x] `TipoCobrancaContratoListModal.tsx`
- [x] `IPv4ListModal.tsx`
- [x] `IPv6ListModal.tsx`
- [x] `DominioListModal.tsx`
- [x] `IpsPermitidosListModal.tsx`
- [x] `SshDeviceListModal.tsx`
- [x] `NotaFiscalListModal.tsx`
- [x] `ContasPagarListModal.tsx`
- [x] `ContratoListModal.tsx`
- [x] `ContasReceberListModal.tsx`
- [x] `RpkiRoaListModal.tsx`
- [x] `RpkiAspaListModal.tsx`
- [x] `RpkiCaListModal.tsx`
- [x] `RpkiCaParentListModal.tsx`
- [x] `RpkiRepositoryListModal.tsx`
- [x] `SaasPlanoListModal.tsx`
- [x] `SaasBancosModal.tsx`
- [x] `SaasClientesModal.tsx`
- [x] `SaasTipoCobrancaModal.tsx`
- [x] `SaasUsuariosModal.tsx`
- [x] `SaasServidorEmailModal.tsx` → `SaasServidorListModalCore`
- [x] `SaasServidorWhatsappModal.tsx` → `SaasServidorListModalCore`

### Infraestrutura de listagem

- [x] Adotar `components/common/ListModal.tsx` (todos os list modals)
- [x] Criar `useEntityListModal` — `hooks/useEntityListModal.ts`
- [x] `normalizeListPagination` — `utils/pagination.ts`
- [x] Remover `setTimeout` em buscas nos modais migrados (via hook)

### ERP × SaaS

- [x] `NFSeConfigSection` / `SaasNFSeConfigSection` → `modals/nfse/NFSeConfigSectionCore` + `nfseConfigVariants`
- [x] `NFSeModal` / `SaasNfseModal` → `modals/nfse/NFSeModalCore`
- [x] `RecursosSistemaModal` / `SaasRecursosSistemaModal` → `RecursosSistemaModalCore`
- [ ] `ServidorTab` email / whatsapp (ERP — abas de configuração única)
- [ ] `MensagensTab` email / whatsapp (ERP)
- [x] `ReceberModal` / `SaasReceberModal` → `ReceberModalCore`
- [x] `AgendadorTarefasModal` / `SaasAgendadorTarefasModal` (wrapper fino — já SaaS)
- [x] `RotinaAgendadaModal` / `SaasRotinaAgendadaModal` (wrapper fino)
- [ ] Forms SaaS ↔ ERP (ver tabela seção 2)

### Logs

- [x] `modals/logs/LogsModal.tsx` + `logsModalRegistry.ts`
- [ ] `RpkiRoaLogsModal.tsx` → merge
- [ ] `RpkiAspaLogsModal.tsx` → merge
- [ ] `RpkiValidationLogsModal.tsx` → merge
- [ ] `RpkiRepositorioLogsModal.tsx` → merge
- [ ] `RpkiCaPaiLogsModal.tsx` → merge
- [ ] Renomear `common/LogsModal.tsx` → `RotinaLogsModal.tsx`

### Forms

- [~] `ModalFormActions` (adotado)
- [~] `AddressFields` / `ContactFields` (poucos usos)
- [ ] `useEntityFormModal` (proposto)

### UI

- [~] `components/ui/buttons/*` (adotado na maioria)
- [ ] Migrar `btn btn-*` restantes (ver seção 6)

### Páginas / context

- [ ] `I18nContext.tsx` → arquivos por domínio
- [ ] `Layout.tsx` → subcomponentes
- [ ] `CentralAssinante.tsx` → seções

---

## Referências

- Regras frontend: `.cursor/rules/frontend-react.mdc`
- Regras globais (botões, confirmações): `.cursor/rules/meu-projeto.mdc`
- README de componentes: `frontend/src/components/README.md`
