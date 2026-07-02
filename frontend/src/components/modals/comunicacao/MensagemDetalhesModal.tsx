import React from 'react';
import { useLocation } from 'react-router-dom';
import DraggableModal from '../../common/DraggableModal';
import FormField from 'components/ui/FormField';
import { formatDateTime } from '../../../utils/formatters';
import { useI18n } from '../../../contexts/I18nContext';
import { stripHtml } from 'utils/stripHtml';

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

const noopChange = () => undefined;

const MensagemDetalhesModal: React.FC<MensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem
}) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const tenantEmpresaLabel = pathname.startsWith('/saas') ? t('audit.tenants') : t('company.title');

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
    const razao = (e?.razao_social ?? '').trim();
    if (razao) return razao;
    const fantasia = (e?.nome_fantasia ?? '').trim();
    if (fantasia) return fantasia;
    return (e?.nome_empresa ?? '').trim();
  })();
  const entidadeText =
    mensagem.entidade_tipo && mensagem.entidade_id
      ? `${mensagem.entidade_tipo} #${mensagem.entidade_id}`
      : '-';
  const mensagemTexto = stripHtml(mensagem.mensagem);

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId="logs-mensagem-details-modal"
    >
      <div className="p-3 logs-auditoria-details">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="mensagem_id"
              type="text"
              label={t('table.id')}
              value={String(mensagem.id)}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem_tipo"
              type="text"
              label={t('history.type')}
              value={formatTipo(mensagem.tipo)}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem_status"
              type="text"
              label={t('history.status')}
              value={formatStatus(mensagem.status)}
              onChange={noopChange}
              size="sm"
              readOnly
              className={mensagem.status === 'erro' ? 'text-danger' : undefined}
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem_created_at"
              type="text"
              label={t('history.dateTime')}
              value={formatDateTime(mensagem.created_at)}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem_cliente"
              type="text"
              label={t('history.client')}
              value={clienteText}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          {empresaText ? (
            <div className="col-12">
              <FormField
                name="mensagem_empresa"
                type="text"
                label={tenantEmpresaLabel}
                value={empresaText}
                onChange={noopChange}
                size="sm"
                readOnly
              />
            </div>
          ) : null}
          <div className="col-12">
            <FormField
              name="mensagem_destinatario"
              type="text"
              label={t('history.recipient')}
              value={mensagem.destinatario}
              onChange={noopChange}
              size="sm"
              readOnly
              className="font-monospace"
            />
          </div>
          {mensagem.tipo === 'email' ? (
            <div className="col-12">
              <FormField
                name="mensagem_titulo"
                type="text"
                label={t('history.subject')}
                value={mensagem.titulo || '-'}
                onChange={noopChange}
                size="sm"
                readOnly
              />
            </div>
          ) : null}
          {(mensagem.entidade_tipo || mensagem.entidade_id) ? (
            <div className="col-12">
              <FormField
                name="mensagem_entidade"
                type="text"
                label={t('history.entity')}
                value={entidadeText}
                onChange={noopChange}
                size="sm"
                readOnly
              />
            </div>
          ) : null}
          <div className="col-12">
            <FormField
              name="mensagem_usuario"
              type="text"
              label={t('history.user')}
              value={usuarioText}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          {mensagem.erro_mensagem ? (
            <div className="col-12">
              <FormField
                name="mensagem_erro"
                type="textarea"
                label={t('history.error')}
                value={mensagem.erro_mensagem}
                onChange={noopChange}
                size="sm"
                readOnly
                className="text-danger"
                rows={Math.min(8, Math.max(2, mensagem.erro_mensagem.split('\n').length + 1))}
              />
            </div>
          ) : null}
          <div className="col-12">
            <FormField
              name="mensagem_conteudo"
              type="textarea"
              label={t('history.message')}
              value={mensagemTexto}
              onChange={noopChange}
              size="sm"
              readOnly
              className="font-monospace"
              rows={12}
            />
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default MensagemDetalhesModal;
