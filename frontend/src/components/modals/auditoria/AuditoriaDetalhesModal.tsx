import React, { useCallback } from 'react';
import DraggableModal from 'components/common/DraggableModal';
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
        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('table.action')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={formatAcao(d.acao)}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('audit.entity')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={d.entidade}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('audit.timestamp')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={formatTimestamp(d.timestamp)}
              readOnly
            />
          </div>
          {showEmpresaColumn && (
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{empresaNomeFieldLabel ?? t('company.title')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={d.empresa_nome?.trim() || '—'}
                readOnly
              />
            </div>
          )}
          {showClienteColumn && (
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('table.client')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={(d.cliente_nome ?? '').trim() || '—'}
                readOnly
              />
            </div>
          )}
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('audit.user')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={d.usuario_email || 'N/A'}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('table.name')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={d.usuario_nome || '-'}
              readOnly
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small text-muted mb-1">{t('audit.ip')}</label>
            <input
              type="text"
              className="form-control form-control-sm bg-secondary bg-opacity-10"
              value={d.ip_address || 'N/A'}
              readOnly
            />
          </div>
          {!showEmpresaColumn && d.empresa_nome && (
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('audit.tenants')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={d.empresa_nome.trim() || '—'}
                readOnly
              />
            </div>
          )}
          {d.rota && (
            <div className="col-12">
              <label className="form-label small text-muted mb-1">{t('audit.route')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
                value={`${d.metodo_http || 'N/A'} ${d.rota}`}
                readOnly
              />
            </div>
          )}
          {d.user_agent && (
            <div className="col-12">
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
            <div className="col-12">
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
        </div>
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
