import React from 'react';
import DraggableModal from '../../common/DraggableModal';
import { formatDateTime } from '../../../utils/formatters';
import { Badge } from '../../ui';

const stripHtml = (html: string): string => {
  // Remove scripts e estilos primeiro
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove todas as tags HTML
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, '');

  // Decodifica entidades HTML comuns
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
    .replace(/&\w+;/g, ' '); // Remove outras entidades HTML

  // Limpa espaços e quebras de linha
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Remove espaços múltiplos
    .replace(/\n\s*\n/g, '\n') // Remove linhas vazias extras
    .trim();

  return cleaned;
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
    usuario?: { id: number; nome: string; email: string };
    created_at: string;
  } | null;
}

const MensagemDetalhesModal: React.FC<MensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem
}) => {
  if (!mensagem) return null;

  const getTipoBadgeClass = (tipo: string) => {
    return tipo === 'email' ? 'primary' : 'success';
  };

  const getStatusBadgeClass = (status: string) => {
    return status === 'enviada' ? 'success' : 'danger';
  };

  const formatTipo = (tipo: string) => {
    return tipo === 'email' ? 'Email' : 'WhatsApp';
  };

  const formatStatus = (status: string) => {
    return status === 'enviada' ? 'Enviada' : 'Erro';
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={`Detalhes da Mensagem ${formatTipo(mensagem.tipo)}`}
      size="lg"
    >
      <div style={{ padding: '12px' }}>
        {/* Informações Gerais */}
        <div className="mb-2">
          <h6 className="mb-2" style={{ fontSize: '0.9rem' }}>Informações Gerais</h6>
          <div className="row g-1">
            <div className="col-md-3">
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>ID:</small><br />
              <span className="fw-medium" style={{ fontSize: '0.8rem' }}>#{mensagem.id}</span>
            </div>
            <div className="col-md-3">
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>Tipo:</small><br />
              <div style={{ fontSize: '0.7rem' }}>
                <Badge variant={getTipoBadgeClass(mensagem.tipo) as 'primary' | 'success'}>
                  {formatTipo(mensagem.tipo)}
                </Badge>
              </div>
            </div>
            <div className="col-md-3">
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>Status:</small><br />
              <div style={{ fontSize: '0.7rem' }}>
                <Badge variant={getStatusBadgeClass(mensagem.status) as 'success' | 'danger'}>
                  {formatStatus(mensagem.status)}
                </Badge>
              </div>
            </div>
            <div className="col-md-3">
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>Data/Hora:</small><br />
              <span style={{ fontSize: '0.75rem' }}>{formatDateTime(mensagem.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Cliente */}
        {mensagem.cliente_nome && (
          <div className="mb-2">
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Cliente:</small><br />
            <span className="fw-medium" style={{ fontSize: '0.8rem' }}>{mensagem.cliente_nome}</span>
            {mensagem.cliente_email && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{mensagem.cliente_email}</div>
            )}
            {mensagem.cliente_telefone && (
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{mensagem.cliente_telefone}</div>
            )}
          </div>
        )}

        {/* Destinatário */}
        <div className="mb-2">
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Destinatário:</small><br />
          <span className="text-monospace fw-medium" style={{ fontSize: '0.8rem' }}>{mensagem.destinatario}</span>
        </div>

        {/* Assunto (apenas para email) */}
        {mensagem.tipo === 'email' && mensagem.titulo && (
          <div className="mb-2">
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Assunto:</small><br />
            <span className="fw-medium" style={{ fontSize: '0.8rem' }}>{mensagem.titulo}</span>
          </div>
        )}

        {/* Entidade relacionada */}
        {mensagem.entidade_tipo && mensagem.entidade_id && (
          <div className="mb-2">
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Entidade Relacionada:</small><br />
            <span className="text-capitalize fw-medium" style={{ fontSize: '0.8rem' }}>
              {mensagem.entidade_tipo} #{mensagem.entidade_id}
            </span>
          </div>
        )}

        {/* Usuário */}
        <div className="mb-2">
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Enviado por:</small><br />
          {mensagem.usuario ? (
            <>
              <span className="fw-medium" style={{ fontSize: '0.8rem' }}>{mensagem.usuario.nome}</span>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{mensagem.usuario.email}</div>
            </>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sistema Automático</span>
          )}
        </div>

        {/* Mensagem de erro */}
        {mensagem.erro_mensagem && (
          <div className="mb-2">
            <small className="text-muted text-danger" style={{ fontSize: '0.75rem' }}>Erro:</small><br />
            <div className="alert alert-danger mt-1 mb-0" style={{ padding: '6px 8px', fontSize: '0.75rem' }}>
              <small className="fw-medium" style={{ fontSize: '0.75rem' }}>{mensagem.erro_mensagem}</small>
            </div>
          </div>
        )}

        {/* Conteúdo da Mensagem */}
        <div>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Conteúdo da Mensagem:</small><br />
          <div
            className="border rounded p-2 mt-1"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              maxHeight: '250px',
              overflow: 'auto',
              fontSize: '0.75rem',
              lineHeight: '1.3',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid var(--border-color)'
            }}
          >
            {stripHtml(mensagem.mensagem)}
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default MensagemDetalhesModal;