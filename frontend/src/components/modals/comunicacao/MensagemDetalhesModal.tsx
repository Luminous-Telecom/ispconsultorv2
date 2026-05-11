import React from 'react';
import DraggableModal from '../../common/DraggableModal';
import { formatDateTime } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';

const stripHtml = (html: string): string => {
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')
    .replace(/&\w+;/g, ' ');
  return cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

interface MensagemDetalhesModalProps {
  show: boolean;
  onClose: () => void;
  mensagem: {
    id: number;
    tipo: 'email' | 'whatsapp';
    destinatario: string;
    titulo?: string;
    mensagem: string;
    status: 'enviada' | 'erro';
    erro_mensagem?: string;
    entidade_tipo?: string;
    entidade_id?: number;
    cliente_nome?: string;
    cliente_email?: string;
    cliente_telefone?: string;
    empresa?: {
      razao_social?: string | null;
      nome_fantasia?: string | null;
      nome_empresa?: string | null;
    } | null;
    usuario?: { id: number; nome: string; email: string };
    created_at: string;
  } | null;
}

const MensagemDetalhesModal: React.FC<MensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem
}) => {
  const { t } = useI18n();
  if (!mensagem) return null;

  const formatTipo = (tipo: string) => (tipo === 'email' ? t('history.email') : t('history.whatsapp'));
  const formatStatus = (status: string) => (status === 'enviada' ? t('history.sent') : t('history.errorStatus'));
  const clienteText = [mensagem.cliente_nome, mensagem.cliente_email, mensagem.cliente_telefone]
    .filter(Boolean)
    .join(' / ') || '-';
  const usuarioText = mensagem.usuario
    ? `${mensagem.usuario.nome} (${mensagem.usuario.email})`
    : t('history.system');
  const empresaText = (() => {
    const e = mensagem.empresa;
    const nome = (e?.razao_social || e?.nome_fantasia || e?.nome_empresa || '').trim();
    return nome || '';
  })();

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId="logs-mensagem-details-modal"
    >
      <div className="p-3 logs-auditoria-details">
        <div className="mb-3">
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('table.id')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={String(mensagem.id)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.type')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={formatTipo(mensagem.tipo)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.status')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={formatStatus(mensagem.status)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.dateTime')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={formatDateTime(mensagem.created_at)}
                readOnly
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.client')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={clienteText}
                readOnly
              />
            </div>
            {empresaText ? (
              <div className="col-md-6">
                <label className="form-label small text-muted mb-1">{t('company.title')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10"
                  value={empresaText}
                  readOnly
                />
              </div>
            ) : null}
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.recipient')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10 font-monospace"
                value={mensagem.destinatario}
                readOnly
              />
            </div>
            {mensagem.tipo === 'email' && (
              <div className="col-md-6">
                <label className="form-label small text-muted mb-1">{t('history.subject')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10"
                  value={mensagem.titulo || '-'}
                  readOnly
                />
              </div>
            )}
            {(mensagem.entidade_tipo || mensagem.entidade_id) && (
              <div className="col-md-6">
                <label className="form-label small text-muted mb-1">{t('history.entity')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10"
                  value={mensagem.entidade_tipo && mensagem.entidade_id
                    ? `${mensagem.entidade_tipo} #${mensagem.entidade_id}`
                    : '-'}
                  readOnly
                />
              </div>
            )}
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">{t('history.user')}</label>
              <input
                type="text"
                className="form-control form-control-sm bg-secondary bg-opacity-10"
                value={usuarioText}
                readOnly
              />
            </div>
            {mensagem.erro_mensagem && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">{t('history.error')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary bg-opacity-10 text-danger"
                  value={mensagem.erro_mensagem}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <h6 className="mb-2">{t('history.message')}</h6>
          <textarea
            className="form-control font-monospace small bg-secondary bg-opacity-10"
            value={stripHtml(mensagem.mensagem)}
            readOnly
            rows={12}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default MensagemDetalhesModal;