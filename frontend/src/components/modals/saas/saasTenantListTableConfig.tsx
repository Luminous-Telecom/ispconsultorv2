
import type { TranslationKeys } from 'contexts/I18nContext';
import type { TableConfig } from 'components/tables/types';
import type { SaasEmpresa } from 'services/saas/saasEmpresasService';

export type SaasEmpresaRow = SaasEmpresa & { created_at_formatada?: string | null };

type TFn = (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;

/** Lista tenants SaaS: mesmas colunas do cadastro de clientes ERP */
export function getSaasTenantListSearchFields(t: TFn): Array<{ key: string; label: string }> {
  return [
    { key: 'todos', label: t('table.searchAllFields') },
    { key: 'id', label: t('table.id') },
    { key: 'cnpj', label: t('form.cnpj') },
    { key: 'razao_social', label: t('form.companyName') },
    { key: 'nome_fantasia', label: t('form.tradeName') },
    { key: 'email', label: t('form.email') },
    { key: 'whatsapp', label: t('form.phone') },
    { key: 'endereco', label: t('form.address') },
    { key: 'numero', label: t('form.number') },
    { key: 'complemento', label: t('form.complement') },
    { key: 'bairro', label: t('form.neighborhood') },
    { key: 'cidade', label: t('form.city') },
    { key: 'estado', label: t('form.state') },
  ];
}

export function getSaasTenantListColumns(
  t: TFn,
  formatDateTime: (iso: string) => string
): TableConfig<SaasEmpresaRow>['columns'] {
  return [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (i) => <span>{i.id}</span>
    },
    {
      key: 'cnpj',
      label: t('form.cnpj'),
      sortable: true,
      width: '130px',
      render: (i) => <span className="text-nowrap">{i.cnpj}</span>
    },
    {
      key: 'razao_social',
      label: t('form.companyName'),
      sortable: true,
      width: '200px',
      render: (i) => <span>{i.razao_social}</span>
    },
    {
      key: 'nome_fantasia',
      label: t('form.tradeName'),
      sortable: true,
      width: '180px',
      render: (i) => <span className="text-muted">{i.nome_fantasia || '-'}</span>
    },
    {
      key: 'email',
      label: t('form.email'),
      sortable: true,
      width: '200px',
      render: (i) => <span className="text-nowrap">{i.email}</span>
    },
    {
      key: 'whatsapp',
      label: t('form.phone'),
      sortable: true,
      width: '120px',
      render: (i) => (
        <span className="text-nowrap">{i.celular || i.telefone || '-'}</span>
      )
    },
    {
      key: 'endereco',
      width: '180px',
      label: t('form.address'),
      sortable: true,
      render: (i) => <span>{i.endereco || '-'}</span>
    },
    {
      key: 'numero',
      label: t('form.number'),
      sortable: true,
      width: '70px',
      render: (i) => <span>{i.numero || '-'}</span>
    },
    {
      key: 'complemento',
      label: t('form.complement'),
      sortable: true,
      width: '120px',
      render: (i) => <span>{i.complemento || '-'}</span>
    },
    {
      key: 'bairro',
      label: t('form.neighborhood'),
      sortable: true,
      width: '120px',
      render: (i) => <span>{i.bairro || '-'}</span>
    },
    {
      key: 'cidade',
      label: t('form.city'),
      sortable: true,
      width: '130px',
      render: (i) => <span>{i.cidade || '-'}</span>
    },
    {
      key: 'estado',
      label: t('form.state'),
      sortable: true,
      width: '63px',
      render: (i) => <span>{i.estado || '-'}</span>
    },
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (i) => {
        const isAtivo = !i.bloqueado_por_atraso;
        return (
          <span className={`badge ${isAtivo ? 'bg-success' : 'bg-secondary'}`}>
            {isAtivo ? t('status.active') : t('status.inactive')}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '145px',
      render: (i) => {
        if (i.created_at_formatada) return i.created_at_formatada;
        return i.created_at ? formatDateTime(i.created_at) : '-';
      }
    },
  ];
}
