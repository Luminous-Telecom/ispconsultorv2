import React from 'react';
import { formatAuditoriaListId, formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import type { TableColumn as TableColumnType } from 'components/tables/types';
import type { SaasContrato, SaasTitulo } from 'services/saas/saasCrudService';
import type { SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import type { AuditoriaLog } from 'services/auditoriaService';
import type { SaasEmpresaTranslateFn, StatusEmpresa } from './types';

export function buildContratosColumns(
  t: SaasEmpresaTranslateFn,
  statusEmpresa?: StatusEmpresa
): TableColumnType<SaasContrato>[] {
  return [
    { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (i) => i.id },
    { key: 'plano', label: t('table.plan'), sortable: true, searchable: true, render: (i) => i.plano?.nome ?? '—' },
    { key: 'valor_mensal', label: t('table.planValue'), sortable: true, searchable: false, render: (i) => i.plano?.valor_mensal != null ? formatCurrency(i.plano.valor_mensal) : '—' },
    {
      key: 'status',
      label: t('form.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (i) => {
        const displayStatus = statusEmpresa?.bloqueado_por_atraso ? 'bloqueado' : statusEmpresa?.em_atraso ? 'em_atraso' : i.status === 'ativo' ? 'ativo' : 'inativo';
        const label = displayStatus === 'bloqueado' ? t('status.blocked') : displayStatus === 'em_atraso' ? t('status.inArrears') : i.status === 'ativo' ? t('status.active') : t('status.inactive');
        const variant = displayStatus === 'bloqueado' ? 'danger' : displayStatus === 'em_atraso' ? 'warning' : i.status === 'ativo' ? 'success' : 'secondary';
        return <span className={`badge bg-${variant}`}>{label}</span>;
      },
    },
    { key: 'desconto_percentual', label: t('table.discountPercent'), sortable: true, searchable: true, render: () => '—' },
    { key: 'desconto_valor', label: t('table.discountValue'), sortable: true, searchable: true, render: () => '—' },
    { key: 'valor_final', label: t('table.finalValue'), sortable: true, searchable: true, render: (i) => formatCurrency(i.valor ?? 0) },
    { key: 'data_inicio', label: t('table.contractStartDate'), sortable: true, searchable: false, render: (i) => formatDate(i.data_inicio) },
    { key: 'data_fim', label: t('table.contractEndDate'), sortable: true, searchable: false, render: (i) => i.data_fim ? formatDate(i.data_fim) : '—' },
    {
      key: 'isento_mensalidade',
      label: t('table.exempt'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('ui.yes'), t('ui.no')],
      render: (i) => (
        <span className={`badge ${i.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {i.isento_mensalidade ? t('ui.yes') : t('ui.no')}
        </span>
      ),
    },
    { key: 'dia_vencimento', label: t('table.dueDay'), sortable: true, searchable: true, render: (i) => i.dia_vencimento != null ? String(i.dia_vencimento).padStart(2, '0') : '—' },
    { key: 'banco', label: t('form.bank'), sortable: true, searchable: true, render: (i) => i.banco?.nome || i.banco?.banco || '—' },
    { key: 'created_at', label: t('table.createdAt'), sortable: true, searchable: false, render: () => '—' },
  ];
}

export function buildContratosSearchFields(t: SaasEmpresaTranslateFn) {
  return [
    { key: 'id', label: t('table.id') },
    { key: 'plano', label: t('table.plan') },
    { key: 'status', label: t('form.status') },
    { key: 'valor_final', label: t('table.finalValue') },
    { key: 'desconto_percentual', label: t('table.discountPercent') },
    { key: 'desconto_valor', label: t('table.discountValue') },
    { key: 'banco', label: t('form.bank') },
  ];
}

export function buildUsuariosColumns(t: SaasEmpresaTranslateFn): TableColumnType<SaasTenantUsuario>[] {
  return [
    { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (i) => i.id },
    { key: 'nome', label: t('form.name'), sortable: true, searchable: true, render: (i) => i.nome },
    { key: 'email', label: t('form.email'), sortable: true, searchable: true, render: (i) => i.email },
    { key: 'role', label: t('user.profile'), sortable: true, searchable: true, render: (i) => <span className="badge bg-info">{i.role === 'admin' ? t('user.admin') : t('user.user')}</span> },
    { key: 'ativo', label: t('table.status'), sortable: true, searchable: false, render: (i) => <span className={`badge ${i.ativo ? 'bg-success' : 'bg-secondary'}`}>{i.ativo ? t('status.active') : t('status.inactive')}</span> },
  ];
}

export function buildUsuariosSearchFields(t: SaasEmpresaTranslateFn) {
  return [
    { key: 'id', label: t('table.id') },
    { key: 'nome', label: t('form.name') },
    { key: 'email', label: t('form.email') },
    { key: 'role', label: t('user.profile') },
  ];
}

export function buildTitulosColumns(t: SaasEmpresaTranslateFn): TableColumnType<SaasTitulo>[] {
  return [
    { key: 'id', label: t('table.id'), sortable: true, width: 42, resizable: true, render: (i) => i.id },
    { key: 'numero_titulo', label: t('form.title'), sortable: true, searchable: true, render: (i) => i.numero_titulo ?? '—' },
    { key: 'valor', label: t('form.value'), sortable: true, searchable: true, render: (i) => formatCurrency(i.valor) },
    { key: 'data_vencimento', label: t('form.dueDate'), sortable: true, searchable: false, render: (i) => new Date(i.data_vencimento).toLocaleDateString('pt-BR') },
    { key: 'status', label: t('table.status'), sortable: true, searchable: true, render: (i) => <span className={`badge bg-${i.pago ? 'success' : 'warning'}`}>{i.pago ? t('status.paid') : i.status}</span> },
    { key: 'plano', label: t('form.plan'), sortable: true, searchable: true, render: (i) => i.plano?.nome ?? '—' },
  ];
}

export function buildTitulosSearchFields(t: SaasEmpresaTranslateFn) {
  return [
    { key: 'id', label: t('table.id') },
    { key: 'numero_titulo', label: t('table.titleNumber') },
    { key: 'status', label: t('form.status') },
    { key: 'valor', label: t('form.value') },
    { key: 'plano', label: t('form.plan') },
  ];
}

export function buildLogsColumns(t: SaasEmpresaTranslateFn): TableColumnType<AuditoriaLog>[] {
  return [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: 56,
      sortValue: (log) => log.operacional_id ?? String(log.id),
      render: (log) => {
        const { display, title } = formatAuditoriaListId(log);
        return <span className="small text-muted" title={title}>{display}</span>;
      },
    },
    { key: 'timestamp', label: t('audit.timestamp'), sortable: true, width: 130, render: (log) => <span className="small">{formatDateTime(log.timestamp)}</span> },
    {
      key: 'acao',
      label: t('table.action'),
      sortable: true,
      width: 90,
      render: (log) => {
        const acoes: Record<string, string> = {
          create: t('audit.actions.create'),
          update: t('audit.actions.update'),
          delete: t('audit.actions.delete'),
          login: t('audit.actions.login'),
          logout: t('audit.actions.logout'),
          export: t('audit.actions.export'),
          import: t('audit.actions.import'),
        };
        const classes: Record<string, string> = {
          create: 'success',
          update: 'primary',
          delete: 'danger',
          login: 'info',
          logout: 'secondary',
          export: 'warning',
          import: 'warning',
        };
        const acao = acoes[log.acao] || log.acao;
        const cls = classes[log.acao] || 'secondary';
        return <span className={`badge bg-${cls}`}>{acao}</span>;
      },
    },
    { key: 'entidade', label: t('audit.entity'), sortable: true, width: 130, render: (log) => <span className="small">{log.entidade}</span> },
    { key: 'usuario_nome', label: t('table.name'), sortable: true, width: 140, render: (log) => <span className="small">{log.usuario_nome || '-'}</span> },
    { key: 'usuario_email', label: t('audit.user'), sortable: true, width: 160, render: (log) => <span className="small">{log.usuario_email || 'N/A'}</span> },
    { key: 'ip_address', label: t('audit.ip'), sortable: true, width: 120, render: (log) => <span className="small text-muted">{log.ip_address || '-'}</span> },
    { key: 'empresa_nome', label: t('audit.tenants'), sortable: true, width: 140, render: (log) => <span className="small">{log.empresa_nome || '-'}</span> },
    { key: 'rota', label: t('audit.route'), sortable: true, render: (log) => <span className="small text-muted">{log.rota || '-'}</span> },
  ];
}

export function buildLogsSearchFields(t: SaasEmpresaTranslateFn) {
  return [
    { key: 'id', label: t('table.id') },
    { key: 'timestamp', label: t('audit.timestamp') },
    { key: 'acao', label: t('table.action') },
    { key: 'entidade', label: t('audit.entity') },
    { key: 'usuario_nome', label: t('table.name') },
    { key: 'usuario_email', label: t('audit.user') },
    { key: 'ip_address', label: t('audit.ip') },
    { key: 'rota', label: t('audit.route') },
  ];
}
