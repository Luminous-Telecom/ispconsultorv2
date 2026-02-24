import React, { useState, useCallback, useMemo } from 'react';
import DraggableModal from '@/components/common/DraggableModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/hooks/useApiTokens';
import { useAuditoria } from '@/hooks/useAuditoria';
import { ApiToken } from '@/services/apiTokenService';

interface ApiTokensModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const ApiTokensModal: React.FC<ApiTokensModalProps> = ({
  show,
  onClose,
  skipWrapper = false
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nome, setNome] = useState('');
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialSortColumn: 'created_at',
    initialSortDirection: 'desc',
  });

  const { data: tokens = [], isLoading, refetch } = useApiTokens();
  const auditoria = useAuditoria();

  const handleAudit = useCallback((token: ApiToken) => {
    auditoria.handleAudit('ApiToken', token.id);
  }, [auditoria]);

  const createMutation = useCreateApiToken((tokenPlain) => {
    setTokenGerado(tokenPlain);
    setNome('');
    setShowCreateForm(false);
    refetch();
  });

  const revokeMutation = useRevokeApiToken();

  const handleCreate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed) return;
    createMutation.mutate(nomeTrimmed);
  }, [nome, createMutation]);

  const handleRevoke = useCallback((token: ApiToken) => {
    const confirmed = window.confirm(`Revogar o token "${token.nome}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    revokeMutation.mutate(token.id);
  }, [revokeMutation]);

  const handleCopiar = useCallback(() => {
    if (!tokenGerado) return;
    navigator.clipboard.writeText(tokenGerado).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }, [tokenGerado]);

  const filteredData = useMemo(() => {
    if (!tableFilters.search.trim()) return tokens;
    const term = tableFilters.search.toLowerCase();
    return tokens.filter(t =>
      t.nome.toLowerCase().includes(term) ||
      t.token_prefix.toLowerCase().includes(term)
    );
  }, [tokens, tableFilters.search]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const col = tableFilters.sortColumn as keyof ApiToken;
      const aVal = a[col];
      const bVal = b[col];
      if (aVal === bVal) return 0;
      const dir = tableFilters.sortDirection === 'asc' ? 1 : -1;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
    return sorted;
  }, [filteredData, tableFilters.sortColumn, tableFilters.sortDirection]);

  const columns: TableConfig<ApiToken>['columns'] = useMemo(() => [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      searchable: true,
      resizable: true,
    },
    {
      key: 'token_prefix',
      label: 'Prefixo',
      sortable: false,
      width: 160,
      render: (item) => <code>{item.token_prefix}…</code>
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      width: 170,
      render: (item) => new Date(item.created_at).toLocaleString('pt-BR')
    },
    {
      key: 'ultimo_uso',
      label: 'Último uso',
      sortable: true,
      width: 170,
      render: (item) => item.ultimo_uso ? new Date(item.ultimo_uso).toLocaleString('pt-BR') : '—'
    },
  ], []);

  const tableConfig: TableConfig<ApiToken> = useMemo(() => ({
    columns,
    data: sortedData,
    loading: isLoading,
    sortable: true,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
    searchable: true,
    searchPlaceholder: 'Buscar tokens...',
    searchFields: [
      { key: 'nome', label: 'Nome' },
      { key: 'token_prefix', label: 'Prefixo' },
    ],
    striped: true,
    hover: true,
    responsive: true,
    selectable: true,
    multiSelect: false,
    emptyMessage: 'Nenhum token criado ainda.',
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: sortedData.length || 15,
      total: sortedData.length,
      from: sortedData.length > 0 ? 1 : 0,
      to: sortedData.length
    },
    bulkActions: [
      {
        key: 'criar-token',
        label: 'Criar Token',
        variant: 'primary',
        requiresSelection: false,
        onClick: () => {
          setTokenGerado(null);
          setShowCreateForm(true);
        },
      },
      {
        key: 'revogar',
        label: 'Revogar',
        variant: 'primary',
        requiresSelection: true,
        disabled: (selected) => selected.length === 0 || revokeMutation.isPending,
        onClick: (selected) => {
          if (selected.length > 0) handleRevoke(selected[0]);
        },
      },
    ],
  }), [columns, sortedData, isLoading, tableFilters.sortColumn, tableFilters.sortDirection, handleRevoke, revokeMutation.isPending]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {tokenGerado && (
        <div className="alert alert-warning border border-warning m-3 mb-0">
          <p className="fw-bold mb-1">Token gerado — copie agora, ele não será exibido novamente:</p>
          <div className="d-flex gap-2 align-items-center">
            <code
              className="flex-grow-1 p-2 rounded"
              style={{ background: 'rgba(0,0,0,0.05)', wordBreak: 'break-all', fontSize: '0.82rem' }}
            >
              {tokenGerado}
            </code>
            <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap" onClick={handleCopiar}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button type="button" className="btn btn-sm btn-link text-muted p-0 mt-1" onClick={() => setTokenGerado(null)}>
            Fechar
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table
          syncWithHeader={false}
          title="Tokens de API"
          config={tableConfig}
          tableId="api-tokens-list"
          onRefresh={refetch}
          onSearch={(term) => tableFilters.setSearch(term)}
          onSort={(col, dir) => tableFilters.setSort(col, dir)}
          onAudit={handleAudit}
          auditEntity="ApiToken"
        />
      </div>

      {showCreateForm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ zIndex: 1060, background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateForm(false); }}
        >
          <div className="card shadow-lg" style={{ width: 420, maxWidth: '90vw' }}>
            <div className="card-header fw-semibold">Criar Token de API</div>
            <form onSubmit={handleCreate}>
              <div className="card-body">
                <label className="form-label">Nome do token</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Integração ERP, Script automação..."
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  maxLength={255}
                  autoFocus
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="card-footer d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || !nome.trim()}
                >
                  Criar Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const auditoriaModal = (
    <ImprimirModal
      show={auditoria.showPreview}
      onClose={auditoria.handleClosePreview}
      pdfUrl={auditoria.pdfUrl}
      isGenerating={auditoria.isGeneratingPdf}
      title="Auditoria - Token de API"
      modalId="auditoria-api-tokens-modal"
    />
  );

  if (skipWrapper) return <>{modalContent}{auditoriaModal}</>;

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Tokens de API"
        size="lg"
        modalId="api-tokens-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auditoriaModal}
    </>
  );
};

export default ApiTokensModal;
