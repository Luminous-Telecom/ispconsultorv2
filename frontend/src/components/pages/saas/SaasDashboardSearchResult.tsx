import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { saasEmpresasService, type SaasEmpresa, type SaasConfigListResponse } from 'services/saas/saasEmpresasService';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { useTableHeader } from 'contexts/TableHeaderContext';
import DashboardSearchResultsShell from '../../dashboard/DashboardSearchResultsShell';

interface SaasDashboardSearchResultProps {
  searchTerm: string;
}

function formatEnderecoTenant(e: SaasEmpresa): string {
  const log = [e.endereco, e.numero].filter(Boolean).join(', ');
  const cidadeUf = [e.bairro, e.cidade, e.estado].filter(Boolean).join(' — ');
  const line = [log, cidadeUf].filter(Boolean).join(' · ');
  return line || '—';
}

function collectTelefonesTenant(e: SaasEmpresa): string[] {
  const raw = [e.telefone, e.celular].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  return Array.from(new Set(raw.map((s) => s.trim())));
}

const SaasDashboardSearchResult: React.FC<SaasDashboardSearchResultProps> = ({ searchTerm }) => {
  const { openModal } = useModal();
  const { searchField } = useTableHeader();

  const { data: empresasResponse, isLoading } = useQuery({
    queryKey: ['saas-empresas-search', searchTerm, searchField],
    queryFn: () =>
      saasEmpresasService.list({
        search: searchTerm,
        searchField: searchField || undefined,
        page: 1,
        limit: 500,
        sortColumn: 'id',
        sortDirection: 'desc',
      }),
    enabled: Boolean(searchTerm),
  });

  const empresas = useMemo(
    () => (empresasResponse?.data as SaasConfigListResponse<SaasEmpresa> | undefined)?.data ?? [],
    [empresasResponse?.data]
  );

  const handleOpenTenant = useCallback(
    (empresaId: number) => {
      openModal('saas-clientes', { empresaId });
    },
    [openModal]
  );

  return (
    <DashboardSearchResultsShell
      isLoading={isLoading}
      hasItems={empresas.length > 0}
      emptyMessage="Nenhum cliente tenant encontrado para esta busca."
    >
      {empresas.map((e) => (
        <SaasDashboardTenantCard key={e.id} empresa={e} onOpen={() => handleOpenTenant(e.id)} />
      ))}
    </DashboardSearchResultsShell>
  );
};

const SaasDashboardTenantCard: React.FC<{ empresa: SaasEmpresa; onOpen: () => void }> = ({
  empresa,
  onOpen,
}) => {
  const { t } = useI18n();
  const telefones = collectTelefonesTenant(empresa);
  const isAtivo = !empresa.bloqueado_por_atraso;

  const subRows: { key: string; ok: boolean; text: string }[] = [
    {
      key: 'tenant-acesso',
      ok: isAtivo,
      text: isAtivo
        ? `${t('audit.tenant')} · ${t('status.active')}`
        : `${t('audit.tenant')} · ${t('status.inArrears')}`,
    },
  ];

  return (
    <article
      className={`dashboard-search-client-card ${isAtivo ? 'is-ativo' : 'is-inativo'}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="dashboard-search-client-card-main">
        <div className="dashboard-search-client-avatar">
          <i
            className={`bi bi-building dashboard-search-client-avatar-icon ${isAtivo ? 'text-success' : 'text-danger'}`}
            aria-hidden
          />
        </div>

        <div className="dashboard-search-client-body">
          <div className="dashboard-search-client-top">
            <div className="dashboard-search-client-identity">
              <div className="dashboard-search-client-id">#{empresa.id}</div>
              <div className="dashboard-search-client-name">{empresa.razao_social}</div>
              <div className="dashboard-search-client-fantasia">
                {empresa.nome_fantasia?.trim() || '—'}
              </div>
            </div>
            <span
              className={`dashboard-search-client-status ${isAtivo ? 'is-ativo' : 'is-inativo'}`}
            >
              {isAtivo ? t('status.active') : t('status.inArrears')}
            </span>
          </div>

          <div className="dashboard-search-client-details">
            <div className="dashboard-search-client-meta">
              <div className="text-truncate" title={empresa.cnpj}>
                {empresa.cnpj}
              </div>
              <div className="text-truncate" title={empresa.email}>
                {empresa.email}
              </div>
              <div className="text-break text-muted">{formatEnderecoTenant(empresa)}</div>
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
    </article>
  );
};

export default SaasDashboardSearchResult;
