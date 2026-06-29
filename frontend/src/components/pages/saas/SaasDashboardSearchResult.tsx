import React, { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { saasEmpresasService, type SaasEmpresa, type SaasConfigListResponse } from 'services/saas/saasEmpresasService';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { Loading } from 'components/ui';

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
  const pagination = (empresasResponse?.data as SaasConfigListResponse<SaasEmpresa> | undefined)?.pagination;
  const total = Math.max(pagination?.total ?? 0, empresas.length);

  const handleOpenTenant = useCallback(
    (empresaId: number) => {
      openModal('saas-clientes', { empresaId });
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

      {isLoading && empresas.length === 0 ? (
        <Loading variant="centered" showMessage={false} className="dashboard-search-loading py-5" />
      ) : empresas.length === 0 ? (
        <div className="dashboard-search-empty text-muted text-center py-5 rounded border border-secondary border-opacity-25">
          Nenhum cliente tenant encontrado para esta busca.
        </div>
      ) : (
        <div className="dashboard-search-card-list d-flex flex-column gap-2">
          {empresas.map((e) => (
            <SaasDashboardTenantCard key={e.id} empresa={e} onOpen={() => handleOpenTenant(e.id)} />
          ))}
        </div>
      )}
    </div>
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
      <div className="dashboard-search-client-card-main d-flex flex-column flex-md-row gap-3 gap-md-4 align-items-stretch">
        <div className="dashboard-search-client-avatar flex-shrink-0 d-flex align-items-center justify-content-center">
          <i
            className={`bi bi-person-fill dashboard-search-client-avatar-icon ${isAtivo ? 'text-success' : 'text-danger'}`}
            aria-hidden
          />
        </div>

        <div className="dashboard-search-client-identity flex-grow-1 min-w-0">
          <div className="dashboard-search-client-id text-muted small">#{empresa.id}</div>
          <div className="dashboard-search-client-name fw-bold text-custom-primary text-uppercase text-break">
            {empresa.razao_social}
          </div>
          <div className="dashboard-search-client-fantasia text-muted small text-break">
            {empresa.nome_fantasia?.trim() || '—'}
          </div>
        </div>

        <div className="dashboard-search-client-meta flex-grow-1 min-w-0 small">
          <div className="text-nowrap text-truncate" title={empresa.cnpj}>
            {empresa.cnpj}
          </div>
          <div className="text-nowrap text-truncate" title={empresa.email}>
            {empresa.email}
          </div>
          <div className="text-break text-muted">{formatEnderecoTenant(empresa)}</div>
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
    </article>
  );
};

export default SaasDashboardSearchResult;
