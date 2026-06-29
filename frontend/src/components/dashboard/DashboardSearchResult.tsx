import React, { useCallback, useEffect, useMemo } from 'react';
import { useClientes } from 'hooks/useClientes';
import { Cliente, Contrato, Plano } from 'types';
import { useModal } from 'contexts/ModalContext';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { Loading } from 'components/ui';

const DASHBOARD_SEARCH_HEADER_FIELDS = [
  { id: 'todos', label: 'Todos' },
  { id: 'id', label: 'ID' },
  { id: 'cnpj', label: 'CNPJ' },
  { id: 'razao_social', label: 'Razão Social' },
  { id: 'nome_fantasia', label: 'Nome Fantasia' },
  { id: 'email', label: 'Email' },
  { id: 'status', label: 'Status' },
];

function formatEndereco(c: Cliente): string {
  const log = [c.endereco, c.numero].filter(Boolean).join(', ');
  const cidadeUf = [c.bairro, c.cidade, c.estado].filter(Boolean).join(' — ');
  const line = [log, cidadeUf].filter(Boolean).join(' · ');
  return line || '—';
}

function collectTelefones(c: Cliente): string[] {
  const raw = [c.telefone, c.whatsapp, c.celular].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  return Array.from(new Set(raw.map((s) => s.trim())));
}

interface DashboardSearchResultProps {
  searchTerm: string;
  searchField: string;
}

const DashboardSearchResult: React.FC<DashboardSearchResultProps> = ({ searchTerm, searchField }) => {
  const { openModal } = useModal();
  const { setAvailableSearchFields, setSearchPlaceholder } = useTableHeader();

  useEffect(() => {
    setAvailableSearchFields(DASHBOARD_SEARCH_HEADER_FIELDS);
    setSearchPlaceholder('Buscar clientes...');
  }, [setAvailableSearchFields, setSearchPlaceholder]);

  const { data: clientesData, isLoading } = useClientes({
    search: searchTerm,
    searchField,
    page: 1,
    limit: 500,
    sortColumn: 'id',
    sortDirection: 'desc',
  });

  const clientes = useMemo((): Cliente[] => clientesData?.data ?? [], [clientesData?.data]);
  const total = Math.max(clientesData?.pagination?.total ?? 0, clientes.length);

  const handleOpenCliente = useCallback(
    (clienteId: number) => {
      openModal('cliente-modal', { clienteId });
    },
    [openModal]
  );

  return (
    <div className="dashboard-search-results animate__animated animate__fadeIn">
      {total > 0 && (
        <div className="dashboard-search-results-header d-flex justify-content-end mb-2">
          <span className="badge bg-primary">{total} encontrados</span>
        </div>
      )}

      {isLoading && clientes.length === 0 ? (
        <Loading variant="centered" showMessage={false} className="dashboard-search-loading py-5" />
      ) : clientes.length === 0 ? (
        <div className="dashboard-search-empty text-muted text-center py-5 rounded border border-secondary border-opacity-25">
          Nenhum cliente encontrado para esta busca.
        </div>
      ) : (
        <div className="dashboard-search-card-list d-flex flex-column gap-2">
          {clientes.map((c) => (
            <DashboardSearchClienteCard
              key={c.id}
              cliente={c}
              onOpen={() => handleOpenCliente(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DashboardSearchClienteCardProps {
  cliente: Cliente;
  onOpen: () => void;
}

const DashboardSearchClienteCard: React.FC<DashboardSearchClienteCardProps> = ({ cliente, onOpen }) => {
  const telefones = collectTelefones(cliente);
  const planos = cliente.planos ?? [];
  const contratos = cliente.contratos ?? [];

  const subRows: { key: string; ok: boolean; text: string }[] = [];
  planos.forEach((p: Plano) => {
    subRows.push({
      key: `plano-${p.id}`,
      ok: p.status === 'ativo',
      text: `Plano: ${p.nome_plano ?? '—'} · ID: ${p.id}`,
    });
  });
  contratos.forEach((ct: Contrato) => {
    subRows.push({
      key: `contrato-${ct.id}`,
      ok: ct.status === 'ativo',
      text: `Contrato #${ct.id} · Status: ${ct.status}`,
    });
  });

  return (
    <article
      className={`dashboard-search-client-card ${cliente.ativo ? 'is-ativo' : 'is-inativo'}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="dashboard-search-client-card-main d-flex flex-column flex-md-row gap-3 gap-md-4 align-items-stretch">
        <div className="dashboard-search-client-avatar flex-shrink-0 d-flex align-items-center justify-content-center">
          <i
            className={`bi bi-person-fill dashboard-search-client-avatar-icon ${cliente.ativo ? 'text-success' : 'text-danger'}`}
            aria-hidden
          />
        </div>

        <div className="dashboard-search-client-identity flex-grow-1 min-w-0">
          <div className="dashboard-search-client-id text-muted small">#{cliente.id}</div>
          <div className="dashboard-search-client-name fw-bold text-custom-primary text-uppercase text-break">
            {cliente.razao_social}
          </div>
          <div className="dashboard-search-client-fantasia text-muted small text-break">
            {cliente.nome_fantasia?.trim() || '—'}
          </div>
        </div>

        <div className="dashboard-search-client-meta flex-grow-1 min-w-0 small">
          <div className="text-nowrap text-truncate" title={cliente.cnpj}>
            {cliente.cnpj}
          </div>
          <div className="text-nowrap text-truncate" title={cliente.email}>
            {cliente.email}
          </div>
          <div className="text-break text-muted">{formatEndereco(cliente)}</div>
        </div>

        <div className="dashboard-search-client-phones flex-shrink-0 text-md-end small">
          {telefones.length === 0 ? (
            <span className="text-muted">—</span>
          ) : (
            telefones.map((tel) => (
              <div key={tel} className="text-nowrap">
                {tel}
              </div>
            ))
          )}
        </div>
      </div>

      {subRows.length > 0 && (
        <div className="dashboard-search-client-subrows mt-2 pt-2 border-top border-secondary border-opacity-25">
          {subRows.map((row) => (
            <div key={row.key} className="dashboard-search-client-subrow d-flex align-items-center gap-2 small">
              <i
                className={`bi ${row.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} flex-shrink-0`}
                aria-hidden
              />
              <span className="text-break text-muted">{row.text}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

export default DashboardSearchResult;
