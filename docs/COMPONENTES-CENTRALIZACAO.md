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
| Modais `*ListModal` com padrão repetido | ~21 |
| Modais SaaS espelhando ERP | ~23 |
| `ListModal` genérico em uso | **0 imports** |
| Pares ERP/SaaS duplicados | ~12 |

---

## Infraestrutura já existente

Use como base antes de criar componentes novos.

### Novidades (Fase 1 — em andamento)

| Recurso | Caminho | Descrição |
|---------|---------|-----------|
| `useEntityListModal` | `hooks/useEntityListModal.ts` | Filtros, seleção, bulk CRUD/seleção, paginação, auditoria |
| `normalizeListPagination` | `utils/pagination.ts` | Paginação ERP/SaaS → formato `Table` |
| `ListModal` (corrigido) | `components/common/ListModal.tsx` | `useMemo` fora do JSX; props `onRowClick`, `modalId`, etc. |

**Modais já migrados:** `BancoListModal`, `FornecedorListModal`.

| Recurso | Caminho | Uso atual |
|---------|---------|-----------|
| `ListModal` | `components/common/ListModal.tsx` | Existe, **não importado** por nenhum modal |
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

O componente `ListModal` em `components/common/ListModal.tsx` já encapsula Table + DraggableModal + bulk + filtros, mas **nenhum modal do projeto o importa**.

### Proposta

1. Evoluir `ListModal` ou criar hook `useEntityListModal({ queryKey, listFn, columns, entityName, ... })`.
2. Cada entidade mantém apenas: colunas, service/hook de dados, bulk actions específicas, sub-modal de formulário.
3. Migrar modais simples primeiro; deixar os complexos por último.

### Prioridade de migração

| Prioridade | Arquivo | Caminho | Observação |
|:----------:|---------|---------|------------|
| Alta | `BancoListModal` | `modals/bancos/BancoListModal.tsx` | Cadastro simples, bom piloto |
| Alta | `FornecedorListModal` | `modals/fornecedores/FornecedorListModal.tsx` | Idem |
| Alta | `PlanoListModal` | `modals/planos/PlanoListModal.tsx` | Idem |
| Alta | `ClienteListModal` | `modals/clientes/ClienteListModal.tsx` | Idem |
| Alta | `AgentListModal` | `modals/agent/AgentListModal.tsx` | Idem |
| Alta | `TipoCobrancaContratoListModal` | `modals/tipoCobrancaContrato/` | Idem |
| Alta | `SaasPlanoListModal` | `modals/saas/SaasPlanoListModal.tsx` | Espelho SaaS |
| Alta | `SaasBancosModal` | `modals/saas/SaasBancosModal.tsx` | Espelho de bancos |
| Alta | `SaasClientesModal` | `modals/saas/SaasClientesModal.tsx` | |
| Alta | `SaasTipoCobrancaModal` | `modals/saas/SaasTipoCobrancaModal.tsx` | |
| Alta | `SaasUsuariosModal` | `modals/saas/SaasUsuariosModal.tsx` | |
| Média | `IPv4ListModal` | `modals/blockdomi/ipv4/` | Ver seção Blockdomi |
| Média | `IPv6ListModal` | `modals/blockdomi/ipv6/` | Par com IPv4 |
| Média | `DominioListModal` | `modals/blockdomi/dominios/` | Bulk extra |
| Média | `IpsPermitidosListModal` | `modals/blockdomi/ips-permitidos/` | |
| Média | `SshDeviceListModal` | `modals/ssh-manager/` | |
| Média | `NotaFiscalListModal` | `modals/notas-fiscais/` | Filtros extras |
| Média | `ContasPagarListModal` | `modals/contas-pagar/` | Resumo financeiro |
| Baixa | `RpkiRoaListModal` | `modals/rpki/` | Regras RPKI |
| Baixa | `RpkiAspaListModal` | `modals/rpki/` | |
| Baixa | `RpkiCaListModal` | `modals/rpki/` | |
| Baixa | `RpkiCaParentListModal` | `modals/rpki/` | |
| Baixa | `RpkiRepositoryListModal` | `modals/rpki/` | |
| Baixa | `ContratoListModal` | `modals/contratos/` | Muitas colunas e bulk |
| Baixa | `ContasReceberListModal` | `modals/contas-receber/` | ~1300 linhas, muitas regras |

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
Fase 1 — ListModal + useEntityListModal
  └── Cadastros simples (Banco, Fornecedor, Plano, Cliente, Agent, TipoCobranca)
  └── SaasBancos, SaasClientes, SaasPlanoList, SaasUsuarios, SaasTipoCobranca

Fase 2 — Pares ERP/SaaS
  └── NFSeConfigSection + modais NFS-e
  └── RecursosSistemaModal
  └── ServidorTab + MensagensTab (email/whatsapp)

Fase 3 — Blockdomi
  └── IPv4/IPv6 factory
  └── DominioListModal

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

### Listagem

- [x] `BancoListModal.tsx` — migrado para `ListModal` + `useEntityListModal`
- [x] `FornecedorListModal.tsx` — migrado para `ListModal` + `useEntityListModal`
- [ ] `PlanoListModal.tsx`
- [ ] `ClienteListModal.tsx`
- [ ] `AgentListModal.tsx`
- [ ] `TipoCobrancaContratoListModal.tsx`
- [ ] `IPv4ListModal.tsx`
- [ ] `IPv6ListModal.tsx`
- [ ] `DominioListModal.tsx`
- [ ] `IpsPermitidosListModal.tsx`
- [ ] `SshDeviceListModal.tsx`
- [ ] `NotaFiscalListModal.tsx`
- [ ] `ContasPagarListModal.tsx`
- [ ] `ContratoListModal.tsx`
- [ ] `ContasReceberListModal.tsx`
- [ ] `RpkiRoaListModal.tsx`
- [ ] `RpkiAspaListModal.tsx`
- [ ] `RpkiCaListModal.tsx`
- [ ] `RpkiCaParentListModal.tsx`
- [ ] `RpkiRepositoryListModal.tsx`
- [ ] `SaasPlanoListModal.tsx`
- [ ] `SaasBancosModal.tsx`
- [ ] `SaasClientesModal.tsx`
- [ ] `SaasTipoCobrancaModal.tsx`
- [ ] `SaasUsuariosModal.tsx`
- [ ] `SaasServidorEmailModal.tsx`
- [ ] `SaasServidorWhatsappModal.tsx`

### Infraestrutura de listagem

- [x] Adotar `components/common/ListModal.tsx` (piloto: Banco, Fornecedor)
- [x] Criar `useEntityListModal` — `hooks/useEntityListModal.ts`
- [x] `normalizeListPagination` — `utils/pagination.ts`
- [x] Remover `setTimeout` em buscas nos modais migrados (via hook)

### ERP × SaaS

- [ ] `NFSeConfigSection` / `SaasNFSeConfigSection`
- [ ] `NFSeModal` / `SaasNfseModal`
- [ ] `RecursosSistemaModal` / `SaasRecursosSistemaModal`
- [ ] `ServidorTab` email / whatsapp
- [ ] `MensagensTab` email / whatsapp
- [ ] `ReceberModal` / `SaasReceberModal`
- [ ] `AgendadorTarefasModal` / `SaasAgendadorTarefasModal`
- [ ] `RotinaAgendadaModal` / `SaasRotinaAgendadaModal`
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
