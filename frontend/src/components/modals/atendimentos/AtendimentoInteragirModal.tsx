import React, { useEffect, useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, ModalFormActions } from 'components/ui';
import { useCreateAtendimentoMensagem } from 'hooks/useAtendimentos';
import { STATUS_ATENDIMENTO_OPTIONS } from './AtendimentoFormFields';

interface AtendimentoInteragirModalProps {
  show: boolean;
  onClose: () => void;
  atendimentoId: number | string;
  clienteId?: number;
  statusAtual?: string;
  onSuccess?: () => void;
}

const AtendimentoInteragirModal: React.FC<AtendimentoInteragirModalProps> = ({
  show,
  onClose,
  atendimentoId,
  clienteId,
  statusAtual = 'N',
  onSuccess,
}) => {
  const createMutation = useCreateAtendimentoMensagem();
  const [mensagem, setMensagem] = useState('');
  const [suStatus, setSuStatus] = useState(statusAtual);

  useEffect(() => {
    if (!show) return;
    setMensagem('');
    setSuStatus(statusAtual);
  }, [show, statusAtual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;

    createMutation.mutate(
      {
        id: atendimentoId,
        mensagem: mensagem.trim(),
        clienteId,
        suStatus,
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      }
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Interagir"
      size="md"
      modalId="atendimento-interagir-modal"
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          formId="atendimento-interagir-form"
          isPending={createMutation.isPending}
        />
      }
    >
      <form
        id="atendimento-interagir-form"
        onSubmit={handleSubmit}
        className="form-modal-simple"
      >
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="su_status"
              type="select"
              label="Status"
              value={suStatus}
              onChange={(v) => setSuStatus(String(v ?? 'N'))}
              options={STATUS_ATENDIMENTO_OPTIONS}
              size="sm"
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem"
              type="textarea"
              label="Mensagem"
              required
              value={mensagem}
              onChange={(v) => setMensagem(String(v ?? ''))}
              rows={5}
              size="sm"
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default AtendimentoInteragirModal;
