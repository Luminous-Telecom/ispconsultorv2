import React from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { TermoContrato } from 'services/termoContratoService';
import { useCreateTermoContrato, useUpdateTermoContrato } from 'hooks/useTermosContrato';
import { useModelosTermo } from 'hooks/useModelosTermo';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import DraggableModal from 'components/common/DraggableModal';
import { AtivoInativoField, ModalFormActions } from 'components/ui';
import { TermoFormData } from '../types';

interface TermoEditModalProps {
  show: boolean;
  onClose: () => void;
  editingTermo: TermoContrato | null;
  contratoId: number;
  termoFormData: TermoFormData;
  setTermoFormData: (data: TermoFormData) => void;
  onSuccess?: () => void;
  onShowSelecionarTermo?: () => void;
}

const TermoEditModal: React.FC<TermoEditModalProps> = ({
  show,
  onClose,
  editingTermo,
  contratoId,
  termoFormData,
  setTermoFormData,
  onSuccess,
  onShowSelecionarTermo
}) => {
  const { error } = useNotificationContext();
  const termoEdit = useEntityRecordEdit('modeloTermo');
  const createTermoMutation = useCreateTermoContrato();
  const updateTermoMutation = useUpdateTermoContrato();
  const { data: termosSistema } = useModelosTermo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validação no frontend
      if (!termoFormData.termoCadastradoId || termoFormData.termoCadastradoId <= 0) {
        error('É obrigatório selecionar um modelo de termo cadastrado no sistema.');
        return;
      }
      
      if (editingTermo) {
        // Atualizar termo existente
        await updateTermoMutation.mutateAsync({
          id: editingTermo.id,
          data: {
            modelo_documento_id: termoFormData.termoCadastradoId,
            assinado: termoFormData.assinado
          }
        });
      } else {
        // Criar novo termo
        await createTermoMutation.mutateAsync({
          contratoId: contratoId,
          data: {
            modelo_documento_id: termoFormData.termoCadastradoId,
            assinado: termoFormData.assinado
          }
        });
      }
      
      // Não fechar o modal automaticamente
      if (onSuccess) onSuccess();
    } catch (err) {
    }
  };

  const isPending = createTermoMutation.isPending || updateTermoMutation.isPending;

  const headerActions = (
    <ModalFormActions
      onCancel={onClose}
      formId="termo-edit-form"
      isPending={isPending}
    />
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Termo"
      size="lg"
      headerActions={headerActions}
    >
      <form id="termo-edit-form" onSubmit={handleSubmit} className="form-modal-simple">
        <div className="row g-2">
          <div className="col-12">
            <EntitySelectField
              value={termoFormData.termoCadastradoId || 0}
              onChange={(value) => setTermoFormData({ ...termoFormData, termoCadastradoId: value })}
              onShowModal={onShowSelecionarTermo}
              onEdit={() => termoEdit.open(termoFormData.termoCadastradoId || 0)}
              entities={termosSistema || []}
              label="Termo Cadastrado"
              idFieldTitle="Digite o ID do termo cadastrado"
              helpText="Selecione um termo cadastrado no sistema"
              required
            />
          </div>

          <div className="col-12">
            <AtivoInativoField
              value={termoFormData.assinado === 'SIM'}
              onChange={(value) => setTermoFormData({ ...termoFormData, assinado: value ? 'SIM' : 'NAO' })}
              label="Assinado"
              name="termo-assinado"
            />
          </div>
        </div>
      </form>
      {termoEdit.modal}
    </DraggableModal>
  );
};

export default TermoEditModal;
