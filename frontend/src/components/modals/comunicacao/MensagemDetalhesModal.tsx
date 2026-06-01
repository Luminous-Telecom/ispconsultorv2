import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import DraggableModal from '../../common/DraggableModal';
import DetailFieldGrid, { DetailFieldItem } from 'components/common/DetailFieldGrid';
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

const MensagemDetalhesModal: React.FC<MensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem
}) => {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const tenantEmpresaLabel = pathname.startsWith('/saas') ? t('audit.tenants') : t('company.title');

  const fields = useMemo((): DetailFieldItem[] => {
    if (!mensagem) return [];

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

    const items: DetailFieldItem[] = [
      { label: t('table.id'), value: String(mensagem.id) },
      { label: t('history.type'), value: formatTipo(mensagem.tipo) },
      { label: t('history.status'), value: formatStatus(mensagem.status) },
      { label: t('history.dateTime'), value: formatDateTime(mensagem.created_at) },
      { label: t('history.client'), value: clienteText },
    ];

    if (empresaText) {
      items.push({ label: tenantEmpresaLabel, value: empresaText });
    }

    items.push({
      label: t('history.recipient'),
      value: <span className="font-monospace">{mensagem.destinatario}</span>,
    });

    if (mensagem.tipo === 'email') {
      items.push({ label: t('history.subject'), value: mensagem.titulo || '-' });
    }

    if (mensagem.entidade_tipo || mensagem.entidade_id) {
      items.push({
        label: t('history.entity'),
        value:
          mensagem.entidade_tipo && mensagem.entidade_id
            ? `${mensagem.entidade_tipo} #${mensagem.entidade_id}`
            : '-',
      });
    }

    items.push({ label: t('history.user'), value: usuarioText });

    if (mensagem.erro_mensagem) {
      items.push({
        label: t('history.error'),
        value: <span className="text-danger">{mensagem.erro_mensagem}</span>,
        colClassName: 'col-12',
      });
    }

    return items;
  }, [mensagem, t, tenantEmpresaLabel]);

  if (!mensagem) return null;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('audit.detailsTitle')}
      size="lg"
      modalId="logs-mensagem-details-modal"
    >
      <div className="p-3 logs-auditoria-details">
        <DetailFieldGrid fields={fields} className="mb-3" />
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
