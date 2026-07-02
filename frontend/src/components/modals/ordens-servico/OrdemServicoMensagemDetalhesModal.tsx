import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { FormField } from 'components/ui';
import type { OrdemServicoMensagem } from 'services/ordemServicoService';
import { formatIxcData } from 'utils/ixcDateTime';

interface OrdemServicoMensagemDetalhesModalProps {
  show: boolean;
  onClose: () => void;
  mensagem: OrdemServicoMensagem | null;
}

const OrdemServicoMensagemDetalhesModal: React.FC<OrdemServicoMensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem,
}) => {
  if (!mensagem) return null;

  const evento = mensagem.evento_nome || `Evento ${mensagem.id_evento}`;
  const operador = mensagem.operador_nome || '-';
  const texto = mensagem.mensagem || '-';
  const linhas = Math.min(12, Math.max(4, texto.split('\n').length + 1));

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Mensagem"
      size="lg"
      modalId="ordem-servico-mensagem-detalhes-modal"
    >
      <div className="p-3 logs-auditoria-details">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="data"
              type="text"
              label="Data"
              value={formatIxcData(mensagem.data)}
              onChange={() => undefined}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="evento"
              type="text"
              label="Evento"
              value={evento}
              onChange={() => undefined}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="operador"
              type="text"
              label="Operador"
              value={operador}
              onChange={() => undefined}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem"
              type="textarea"
              label="Mensagem"
              value={texto}
              onChange={() => undefined}
              rows={linhas}
              size="sm"
              readOnly
            />
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default OrdemServicoMensagemDetalhesModal;
