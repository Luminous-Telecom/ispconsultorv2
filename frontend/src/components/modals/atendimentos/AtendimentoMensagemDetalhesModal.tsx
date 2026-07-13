import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { FormField } from 'components/ui';
import type { AtendimentoMensagem } from 'services/atendimentoService';
import { formatIxcData } from 'utils/ixcDateTime';

interface AtendimentoMensagemDetalhesModalProps {
  show: boolean;
  onClose: () => void;
  mensagem: AtendimentoMensagem | null;
}

const AtendimentoMensagemDetalhesModal: React.FC<AtendimentoMensagemDetalhesModalProps> = ({
  show,
  onClose,
  mensagem,
}) => {
  if (!mensagem) return null;

  const operador = mensagem.operador || '-';
  const texto = mensagem.mensagem || '-';
  const linhas = Math.min(12, Math.max(4, texto.split('\n').length + 1));

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Mensagem"
      size="lg"
      modalId="atendimento-mensagem-detalhes-modal"
    >
      <div className="form-modal-simple logs-auditoria-details">
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

export default AtendimentoMensagemDetalhesModal;
