import React, { useCallback, useMemo } from 'react';
import { useClientes } from 'hooks/useClientes';
import { Cliente, Contrato, Plano } from 'types';
import { useModal } from 'contexts/ModalContext';
import DashboardSearchResultsShell from './DashboardSearchResultsShell';

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

  const { data: clientesData, isLoading } = useClientes({
    search: searchTerm,
    searchField,
    page: 1,
    limit: 500,
    sortColumn: 'id',
    sortDirection: 'desc',
  });

  const clientes = useMemo((): Cliente[] => clientesData?.data ?? [], [clientesData?.data]);

  const handleOpenCliente = useCallback(
    (clienteId: number) => {
      openModal('cliente-modal', { clienteId });
    },
    [openModal]
  );

  return (
    <DashboardSearchResultsShell
      isLoading={isLoading}
      hasItems={clientes.length > 0}
      emptyMessage="Nenhum cliente encontrado para esta busca."
    >
      {clientes.map((c) => (
        <DashboardSearchClienteCard
          key={c.id}
          cliente={c}
          onOpen={() => handleOpenCliente(c.id)}
        />
      ))}
    </DashboardSearchResultsShell>
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
      <div className="dashboard-search-client-card-main">
        <div className="dashboard-search-client-avatar">
          <i
            className={`bi bi-person-fill dashboard-search-client-avatar-icon ${cliente.ativo ? 'text-success' : 'text-danger'}`}
            aria-hidden
          />
        </div>

        <div className="dashboard-search-client-body">
          <div className="dashboard-search-client-top">
            <div className="dashboard-search-client-identity">
              <div className="dashboard-search-client-id">#{cliente.id}</div>
              <div className="dashboard-search-client-name">{cliente.razao_social}</div>
              <div className="dashboard-search-client-fantasia">
                {cliente.nome_fantasia?.trim() || '—'}
              </div>
            </div>
            <span
              className={`dashboard-search-client-status ${cliente.ativo ? 'is-ativo' : 'is-inativo'}`}
            >
              {cliente.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="dashboard-search-client-details">
            <div className="dashboard-search-client-meta">
              <div className="text-truncate" title={cliente.cnpj}>
                {cliente.cnpj}
              </div>
              <div className="text-truncate" title={cliente.email}>
                {cliente.email}
              </div>
              <div className="text-break text-muted">{formatEndereco(cliente)}</div>
            </div>

            <div className="dashboard-search-client-phones">
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
        </div>
      </div>

      {subRows.length > 0 && (
        <div className="dashboard-search-client-subrows">
          {subRows.map((row) => (
            <div key={row.key} className="dashboard-search-client-subrow">
              <i
                className={`bi ${row.ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}`}
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
