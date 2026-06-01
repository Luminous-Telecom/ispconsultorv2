import React, { useCallback, useMemo } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import { useI18n } from 'contexts/I18nContext';
import { formatDateTime } from 'utils/formatters';
import type { AuditoriaLog } from 'services/auditoriaService';

export interface AuditoriaDetalhesModalProps {
  show: boolean;
  onClose: () => void;
  detalhe: AuditoriaLog | null;
  modalId?: string;
  showEmpresaColumn?: boolean;
  /** Rótulo do campo nome do tenant (ex.: SuperAdmin); padrão “Empresa”. */
  empresaNomeFieldLabel?: string;
  showClienteColumn?: boolean;
  esLoading?: boolean;
  esIndisponivel?: boolean;
  temVinculoEs?: boolean;
}

const AuditoriaDetalhesModal: React.FC<AuditoriaDetalhesModalProps> = ({
  show,
  onClose,
  detalhe,
  modalId = 'auditoria-detalhes-modal',
  showEmpresaColumn = false,
  empresaNomeFieldLabel,
  showClienteColumn = false,
  esLoading = false,
  esIndisponivel = false,
  temVinculoEs = false,
}) => {
  const { t } = useI18n();

  const formatTimestamp = useCallback((ts: string) => {
    try {
      return formatDateTime(new Date(ts));
    } catch {
      return ts;
    }
  }, []);

  const formatAcao = useCallback(
    (acao: string) => {
      const map: Record<string, string> = {
        create: t('audit.actions.create'),
        update: t('audit.actions.update'),
        delete: t('audit.actions.delete'),
        login: t('audit.actions.login'),
        logout: t('audit.actions.logout'),
        export: t('audit.actions.export'),
        import: t('audit.actions.import'),
        executar: t('audit.actions.executar'),
      };
      return map[acao] || acao;
    },
    [t]
  );

  const fields = useMemo((): DetailFieldItem[] => {
    if (!detalhe) return [];

    const d = detalhe;
    const empresaLabel = empresaNomeFieldLabel ?? t('company.title');
    const items: DetailFieldItem[] = [
      { label: t('table.action'), value: formatAcao(d.acao) },
      { label: t('audit.entity'), value: d.entidade },
      { label: t('table.id'), value: String(d.entidade_id ?? '—') },
      { label: t('audit.timestamp'), value: formatTimestamp(d.timestamp) },
    ];

    if (showEmpresaColumn) {
      items.push({
        label: empresaLabel,
        value: d.empresa_nome?.trim() || '—',
      });
    }

    if (showClienteColumn) {
      items.push({
        label: t('table.client'),
        value: (d.cliente_nome ?? '').trim() || '—',
      });
    }

    items.push(
      { label: t('audit.user'), value: d.usuario_email || 'N/A' },
      { label: t('table.name'), value: d.usuario_nome || '-' },
      { label: t('audit.ip'), value: d.ip_address || 'N/A' }
    );

    if (!showEmpresaColumn && d.empresa_nome) {
      items.push({
        label: t('audit.tenants'),
        value: d.empresa_nome.trim() || '—',
      });
    }

    if (d.rota) {
      items.push({
        label: t('audit.route'),
        value: <span className="font-monospace">{`${d.metodo_http || 'N/A'} ${d.rota}`}</span>,
        colClassName: 'col-12',
      });
    }

    return items;
  }, [
    detalhe,
    empresaNomeFieldLabel,
    formatAcao,
    formatTimestamp,
    showClienteColumn,
    showEmpresaColumn,
    t,
  ]);

  if (!detalhe) return null;

  const d = detalhe;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId={modalId}
    >
      <div className="p-3 logs-auditoria-details">
        {esIndisponivel && (
          <div className="small text-warning mb-2">
            Detalhe completo no Elasticsearch indisponível; exibindo dados do banco.
          </div>
        )}
        {!temVinculoEs && (
          <div className="small text-warning mb-2">
            Este registro não possui vínculo com o Elasticsearch; exibindo apenas dados do banco.
          </div>
        )}
        <DetailFieldGrid fields={fields} />
        {d.user_agent && (
          <div className="mt-3">
            <label className="form-label small text-muted mb-1">{t('audit.userAgent')}</label>
            <textarea
              className="form-control form-control-sm bg-secondary bg-opacity-10 small"
              value={d.user_agent}
              readOnly
              rows={2}
            />
          </div>
        )}
        {d.observacoes && (
          <div className="mt-3">
            <label className="form-label small text-muted mb-1">{t('table.observations')}</label>
            <textarea
              className="form-control form-control-sm bg-secondary bg-opacity-10 small"
              value={d.observacoes}
              readOnly
              rows={Math.min(18, Math.max(4, d.observacoes.split('\n').length + 1))}
              style={{ resize: 'vertical', minHeight: '5rem' }}
            />
          </div>
        )}
        {(d.dados_anteriores || d.dados_novos || esLoading || temVinculoEs) && (
          <div className="mt-3">
            <h6 className="mb-2">{t('audit.data')}</h6>
            {esLoading && (
              <div className="small text-muted mb-2">Carregando detalhe da auditoria…</div>
            )}
            {(d.dados_anteriores || d.dados_novos) && (
              <textarea
                className="form-control font-monospace small bg-secondary bg-opacity-10"
                value={JSON.stringify(
                  d.dados_anteriores && d.dados_novos
                    ? { anterior: d.dados_anteriores, novo: d.dados_novos }
                    : d.dados_novos || d.dados_anteriores,
                  null,
                  2
                )}
                readOnly
                rows={12}
                style={{ resize: 'none' }}
              />
            )}
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default AuditoriaDetalhesModal;
