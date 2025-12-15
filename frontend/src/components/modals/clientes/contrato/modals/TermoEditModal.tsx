import React from 'react';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { TermoContrato } from '@/services/termoContratoService';
import { useCreateTermoContrato, useUpdateTermoContrato } from '@/hooks/useTermosContrato';
import { useModelosTermo } from '@/hooks/useModelosTermo';
import EntitySelectField from '@/components/ui/EntitySelectField';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
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
  const isMobile = useIsMobile();
  const { error } = useNotificationContext();
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

  const headerActions = (
    <div className="d-flex gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClose}
        disabled={createTermoMutation.isPending || updateTermoMutation.isPending}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="termo-edit-form"
        variant="primary"
        size="sm"
        isLoading={createTermoMutation.isPending || updateTermoMutation.isPending}
      >
        Salvar
      </Button>
    </div>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={editingTermo ? "Editar Termo" : "Novo Termo"}
      size="lg"
      headerActions={headerActions}
    >
      <form id="termo-edit-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="row">
          <div className="col-md-12">
            <EntitySelectField
              value={termoFormData.termoCadastradoId || 0}
              onChange={(value) => setTermoFormData({ ...termoFormData, termoCadastradoId: value })}
              onShowModal={onShowSelecionarTermo}
              entities={termosSistema || []}
              label="Termo Cadastrado"
              idFieldTitle="Digite o ID do termo cadastrado"
              helpText="Selecione um termo cadastrado no sistema"
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Assinado</label>
              <div className="d-flex gap-3 mt-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="assinado"
                    id="assinadoSim"
                    value="SIM"
                    checked={termoFormData.assinado === 'SIM'}
                    onChange={() => setTermoFormData({ ...termoFormData, assinado: 'SIM' })}
                  />
                  <label className="form-check-label" htmlFor="assinadoSim">
                    Sim
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="assinado"
                    id="assinadoNao"
                    value="NAO"
                    checked={termoFormData.assinado === 'NAO'}
                    onChange={() => setTermoFormData({ ...termoFormData, assinado: 'NAO' })}
                  />
                  <label className="form-check-label" htmlFor="assinadoNao">
                    Não
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default TermoEditModal;
