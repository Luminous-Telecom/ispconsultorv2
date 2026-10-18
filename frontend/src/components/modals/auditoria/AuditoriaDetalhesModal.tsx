import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
import FormField from 'components/ui/FormField';
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

const noopChange = () => undefined;

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

  // Update: só valor novo; delete: snapshot anterior.
  const dadosParaExibir = d.dados_novos ?? d.dados_anteriores;
  const dadosJson = dadosParaExibir ? JSON.stringify(dadosParaExibir, null, 2) : '';

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId={modalId}
    >
      <div className="form-modal-simple logs-auditoria-details">
        <DetailFieldGrid fields={fields} />
        {d.user_agent ? (
          <div className="mt-3">
            <FormField
              name="auditoria_user_agent"
              type="textarea"
              label={t('audit.userAgent')}
              value={d.user_agent}
              onChange={noopChange}
              size="sm"
              readOnly
              rows={2}
            />
          </div>
        ) : null}
        {d.observacoes ? (
          <div className="mt-3">
            <FormField
              name="auditoria_observacoes"
              type="textarea"
              label={t('table.observations')}
              value={d.observacoes}
              onChange={noopChange}
              size="sm"
              readOnly
              rows={Math.min(18, Math.max(4, d.observacoes.split('\n').length + 1))}
            />
          </div>
        ) : null}
        {dadosJson ? (
          <div className="mt-3">
            <FormField
              name="auditoria_dados"
              type="textarea"
              label={t('audit.data')}
              value={dadosJson}
              onChange={noopChange}
              size="sm"
              readOnly
              className="font-monospace"
              rows={12}
            />
          </div>
        ) : null}
      </div>
    </DraggableModal>
  );
};

export default AuditoriaDetalhesModal;
