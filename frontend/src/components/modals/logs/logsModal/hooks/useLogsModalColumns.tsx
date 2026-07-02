import { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { formatAuditoriaListId, formatDateTime } from 'utils/formatters';
import { AuditoriaLog } from 'services/auditoriaService';
import { Badge } from 'components/ui';
import { TableConfig } from 'components/tables/types';
import type { BlockdomiLogAcessoItem } from 'services/blockdomiLogAcessoService';
import { formatMensagemEmpresaNome, formatOperacionalPayloadPreview } from '../formatters';
import type { LogsModalType, MensagemItem } from '../types';

interface UseLogsModalColumnsParams {
  logType: LogsModalType;
  showEmpresaColumn: boolean;
  isEmail: boolean;
  formatTimestamp: (ts: string) => string;
  formatAcao: (acao: string) => string;
  getAcaoBadgeClass: (acao: string) => string;
}

export function useLogsModalColumns({
  logType,
  showEmpresaColumn,
  isEmail,
  formatTimestamp,
  formatAcao,
  getAcaoBadgeClass,
}: UseLogsModalColumnsParams) {
  const { t } = useI18n();

  const auditoriaColumns = useMemo(
    () => [
      {
        key: 'id' as const,
        label: t('table.id'),
        sortable: true,
        width: '56px',
        sortValue: (log: AuditoriaLog) => log.operacional_id ?? String(log.id),
        render: (log: AuditoriaLog) => {
          const { display, title } = formatAuditoriaListId(log);
          return (
            <span className="text-muted small" title={title}>
              {display}
            </span>
          );
        },
      },
      {
        key: 'timestamp' as const,
        label: t('audit.timestamp'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => <span className="small">{formatTimestamp(log.timestamp)}</span>,
      },
      ...(showEmpresaColumn
        ? [
            {
              key: 'empresa_nome' as const,
              label: t('audit.tenants'),
              sortable: true,
              width: '168px',
              sortValue: (log: AuditoriaLog) => log.empresa_nome?.trim() ?? '',
              render: (log: AuditoriaLog) => (
                <span
                  className="small text-truncate d-inline-block truncate-max-160"
                  
                  title={log.empresa_nome ?? undefined}
                >
                  {log.empresa_nome?.trim() || '—'}
                </span>
              ),
            },
            {
              key: 'cliente_nome' as const,
              label: t('table.client'),
              sortable: false,
              width: '160px',
              render: (log: AuditoriaLog) => {
                const cn = (log.cliente_nome ?? '').trim();
                return (
                  <span
                    className="small text-truncate d-inline-block truncate-max-150"
                    
                    title={cn || undefined}
                  >
                    {cn || '—'}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: 'usuario_nome' as const,
        label: t('table.name'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => <span className="small">{log.usuario_nome || '-'}</span>,
      },
      {
        key: 'usuario_email' as const,
        label: t('audit.user'),
        sortable: true,
        width: '180px',
        render: (log: AuditoriaLog) => <span className="small">{log.usuario_email || '-'}</span>,
      },
      {
        key: 'ip_address' as const,
        label: t('audit.ip'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => <span className="small text-muted">{log.ip_address || '-'}</span>,
      },
      {
        key: 'acao' as const,
        label: t('table.action'),
        sortable: true,
        render: (log: AuditoriaLog) => (
          <span className={`badge bg-${getAcaoBadgeClass(log.acao)}`}>{formatAcao(log.acao)}</span>
        ),
      },
      {
        key: 'entidade' as const,
        label: t('audit.entity'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => <span className="small">{log.entidade}</span>,
      },
      ...(logType === 'usuarios'
        ? [
            {
              key: 'payload' as const,
              label: t('audit.operacionalCampos'),
              sortable: false,
              width: '240px',
              render: (log: AuditoriaLog) => {
                const { display, title } = formatOperacionalPayloadPreview(log.payload, log.observacoes);
                return (
                  <span
                    className="small font-monospace text-muted text-truncate d-inline-block truncate-max-232"
                    
                    title={title || undefined}
                  >
                    {display}
                  </span>
                );
              },
            },
          ]
        : []),
    ],
    [t, formatTimestamp, formatAcao, getAcaoBadgeClass, showEmpresaColumn, logType]
  );

  const blockdomiColumns: TableConfig<BlockdomiLogAcessoItem>['columns'] = useMemo(
    () => [
      {
        key: 'id' as const,
        label: t('table.id'),
        sortable: true,
        width: '42px',
        render: (i) => <span className="small">{i.id}</span>,
      },
      {
        key: 'ip' as const,
        label: t('blockdomi.logsIp'),
        sortable: true,
        width: '140px',
        render: (i) => i.ip ?? '-',
      },
      ...(showEmpresaColumn
        ? [
            {
              key: 'empresa_nome' as const,
              label: t('audit.tenants'),
              sortable: false,
              width: '160px',
              render: (i: BlockdomiLogAcessoItem) => {
                const nome = (i.empresa_nome ?? '').trim();
                return (
                  <span
                    className="small text-truncate d-inline-block truncate-max-150"
                    
                    title={nome || undefined}
                  >
                    {nome || '—'}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: 'rota' as const,
        label: t('blockdomi.logsRota'),
        sortable: true,
        width: '120px',
        render: (i) => i.rota,
      },
      {
        key: 'metodo' as const,
        label: t('blockdomi.logsMetodo'),
        sortable: true,
        width: '70px',
        render: (i) => i.metodo,
      },
      {
        key: 'status_http' as const,
        label: t('blockdomi.logsStatus'),
        sortable: true,
        width: '80px',
        render: (i) => i.status_http ?? '-',
      },
      {
        key: 'sucesso' as const,
        label: t('blockdomi.logsSucesso'),
        sortable: true,
        width: '90px',
        render: (i) => (
          <span className={`badge bg-${i.sucesso ? 'success' : 'danger'}`}>
            {i.sucesso ? t('blockdomi.logsSucessoOk') : t('blockdomi.logsSucessoErro')}
          </span>
        ),
      },
      {
        key: 'mensagem_erro' as const,
        label: t('blockdomi.logsMensagemErro'),
        sortable: true,
        minWidth: '280px',
        render: (i) => (
          <span
            className="text-break text-muted small d-block truncate-max-520 pre-line"
            
            title={i.mensagem_erro ?? undefined}
          >
            {i.mensagem_erro ?? '-'}
          </span>
        ),
      },
      {
        key: 'created_at' as const,
        label: t('table.createdAt'),
        sortable: true,
        width: '150px',
        render: (i) => i.created_at_formatada ?? i.created_at ?? '-',
      },
    ],
    [t, showEmpresaColumn]
  );

  const mensagemColumns: TableConfig<MensagemItem>['columns'] = useMemo(
    () => [
      {
        key: 'id' as const,
        label: t('table.id'),
        sortable: true,
        width: '42px',
        sortValue: (i: MensagemItem) => i.historico_id_real ?? i.id,
        render: (i: MensagemItem) => <span>{i.historico_id_real ?? i.id}</span>,
      },
      ...(showEmpresaColumn
        ? [
            {
              key: 'empresa_id' as const,
              label: t('audit.tenants'),
              sortable: false,
              width: '168px',
              render: (i: MensagemItem) => {
                const text = formatMensagemEmpresaNome(i);
                return (
                  <span
                    className="small text-truncate d-inline-block truncate-max-160"
                    
                    title={text === '—' ? undefined : text}
                  >
                    {text}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: 'tipo' as const,
        label: t('history.type'),
        sortable: true,
        render: (_i: MensagemItem) => (
          <Badge variant={isEmail ? 'primary' : 'success'}>
            {isEmail ? t('history.email') : t('history.whatsapp')}
          </Badge>
        ),
      },
      ...(isEmail
        ? [
            {
              key: 'titulo' as const,
              label: t('history.subject'),
              sortable: true,
              width: '200px',
              render: (i: MensagemItem) => (
                <div className="text-truncate truncate-max-250"  title={i.titulo}>
                  {i.titulo || <span className="text-muted">-</span>}
                </div>
              ),
            },
          ]
        : []),
      {
        key: 'cliente_nome' as const,
        label: t('history.client'),
        sortable: true,
        width: '150px',
        render: (i: MensagemItem) => <span className="text-nowrap">{i.cliente_nome || '-'}</span>,
      },
      {
        key: 'destinatario' as const,
        label: isEmail ? t('history.recipient') : t('history.phone'),
        sortable: true,
        width: '130px',
        render: (i: MensagemItem) => <span className="text-nowrap">{i.destinatario}</span>,
      },
      {
        key: 'mensagem' as const,
        label: t('history.message'),
        sortable: true,
        width: '200px',
        render: (i: MensagemItem) => (
          <div className="text-truncate truncate-max-300"  title={i.mensagem}>
            {i.mensagem.length > 50 ? `${i.mensagem.substring(0, 50)}...` : i.mensagem}
          </div>
        ),
      },
      {
        key: 'status' as const,
        label: t('history.status'),
        sortable: true,
        render: (i: MensagemItem) => (
          <Badge variant={i.status === 'enviada' ? 'success' : 'danger'}>
            {i.status === 'enviada' ? t('history.sent') : t('history.errorStatus')}
          </Badge>
        ),
      },
      {
        key: 'erro_mensagem' as const,
        label: t('history.error'),
        sortable: true,
        width: '150px',
        render: (i: MensagemItem) =>
          i.erro_mensagem ? (
            <small
              className="text-danger text-truncate d-inline-block truncate-max-200"
              
              title={i.erro_mensagem}
            >
              {i.erro_mensagem}
            </small>
          ) : (
            <span className="text-muted">-</span>
          ),
      },
      {
        key: 'usuario' as const,
        label: t('history.user'),
        sortable: true,
        width: '120px',
        sortValue: (i: MensagemItem) => i.usuario?.nome ?? '',
        render: (i: MensagemItem) =>
          i.usuario ? (
            <span title={i.usuario.email}>{i.usuario.nome}</span>
          ) : (
            <span className="text-muted">{t('history.system')}</span>
          ),
      },
      {
        key: 'created_at' as const,
        label: t('history.dateTime'),
        sortable: true,
        width: '145px',
        render: (i: MensagemItem) => formatDateTime(i.created_at),
      },
    ],
    [t, isEmail, showEmpresaColumn]
  );

  return { auditoriaColumns, blockdomiColumns, mensagemColumns };
}
