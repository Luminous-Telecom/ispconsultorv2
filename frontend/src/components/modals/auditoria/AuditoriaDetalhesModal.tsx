import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import { useI18n } from 'contexts/I18nContext';
import { useLogsAuditoriaFormatters } from 'components/modals/logs/logsModal/hooks/useLogsAuditoriaFormatters';
import type { AuditoriaLog } from 'services/auditoriaService';

export interface AuditoriaDetalhesModalProps {
  show: boolean;
  onClose: () => void;
  detalhe: AuditoriaLog | null;
  modalId?: string;
  showEmpresaColumn?: boolean;
  empresaNomeFieldLabel?: string;
  showClienteColumn?: boolean;
}

const AuditoriaDetalhesModal: React.FC<AuditoriaDetalhesModalProps> = ({
  show,
  onClose,
  detalhe,
  modalId = 'auditoria-detalhes-modal',
  showEmpresaColumn = false,
  empresaNomeFieldLabel,
  showClienteColumn = false,
}) => {
  const { t } = useI18n();
  const { formatTimestamp, formatAcao } = useLogsAuditoriaFormatters();

  const d = detalhe;
  if (!d) return null;

  const fields: DetailFieldItem[] = [
    { label: t('table.id'), value: d.id },
    { label: t('table.action'), value: formatAcao(d.acao) },
    { label: t('audit.entity'), value: d.entidade },
  ];
  if (d.entidade_id != null) {
    fields.push({ label: t('audit.entityId'), value: String(d.entidade_id) });
  }
  if (showEmpresaColumn) {
    fields.push({
      label: empresaNomeFieldLabel ?? t('audit.tenant'),
      value: d.empresa_nome ?? (d.empresa_id != null ? `#${d.empresa_id}` : '—'),
    });
  }
  if (showClienteColumn && d.cliente_nome) {
    fields.push({ label: t('table.client'), value: d.cliente_nome });
  }
  fields.push(
    { label: t('audit.user'), value: d.usuario_nome ?? d.usuario_email ?? '—' },
    { label: t('audit.timestamp'), value: formatTimestamp(d.timestamp) },
    { label: t('audit.ip'), value: d.ip_address ?? '—' }
  );
  if (d.rota) fields.push({ label: t('audit.route'), value: d.rota });

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId={modalId}
    >
      <div className="p-3 logs-auditoria-details">
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
        {(d.dados_anteriores || d.dados_novos) && (
          <div className="mt-3">
            <h6 className="mb-2">{t('audit.data')}</h6>
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
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default AuditoriaDetalhesModal;
