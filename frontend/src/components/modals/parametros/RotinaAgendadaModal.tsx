import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from '../../common/DraggableModal';
import { SchedulerService, CreateRotinaData, UpdateRotinaData } from '../../../services/schedulerService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import FormField from '../../ui/FormField';

interface RotinaAgendadaModalProps {
  show: boolean;
  onClose: () => void;
  rotinaId?: number | null;
  onSuccess?: () => void;
}

const RotinaAgendadaModal: React.FC<RotinaAgendadaModalProps> = ({
  show,
  onClose,
  rotinaId = null,
  onSuccess
}) => {
  const { addNotification } = useNotificationContext();
  const queryClient = useQueryClient();
  const isEditMode = !!rotinaId;

  const [formData, setFormData] = useState<CreateRotinaData>({
    nome: '',
    tipo: 'envio_boletos',
    descricao: '',
    frequencia: 'diaria',
    hora_execucao: '00:00'
  });

  const [ativo, setAtivo] = useState(true);

  const { data: rotinaData, isLoading } = useQuery({
    queryKey: ['rotina', rotinaId],
    queryFn: async () => {
      const response = await SchedulerService.getRotinaById(rotinaId!);
      return response.data;
    },
    enabled: isEditMode && !!rotinaId,
  });

  useEffect(() => {
    if (rotinaData && isEditMode) {
      setFormData({
        nome: rotinaData.nome || '',
        tipo: rotinaData.tipo || 'envio_boletos',
        descricao: rotinaData.descricao || '',
        frequencia: rotinaData.frequencia || 'diaria',
        hora_execucao: rotinaData.hora_execucao || '00:00'
      });
      setAtivo(rotinaData.ativo);
    }
  }, [rotinaData, isEditMode]);

  const createMutation = useMutation({
    mutationFn: (data: CreateRotinaData) => SchedulerService.createRotina(data),
    onSuccess: () => {
      addNotification('success', 'Rotina criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      addNotification('error', error?.response?.data?.message || 'Erro ao criar rotina');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateRotinaData) => SchedulerService.updateRotina(rotinaId!, data),
    onSuccess: () => {
      addNotification('success', 'Rotina atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['rotina', rotinaId] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      addNotification('error', error?.response?.data?.message || 'Erro ao atualizar rotina');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'envio_boletos',
      descricao: '',
      frequencia: 'diaria',
      hora_execucao: '00:00'
    });
    setAtivo(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode) {
      const updateData: UpdateRotinaData = {
        ...formData,
        ativo
      };
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (isLoading) {
    return (
      <DraggableModal show={show} onClose={handleClose} title={isEditMode ? 'Editar Rotina' : 'Nova Rotina'}>
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={isEditMode ? 'Editar Rotina' : 'Nova Rotina'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <FormField
              name="nome"
              label="Nome da Rotina"
              type="text"
              value={formData.nome}
              onChange={(value) => setFormData({ ...formData, nome: value })}
              required
            />
          </div>

          <div className="col-12">
            <FormField
              name="tipo"
              label="Tipo"
              type="select"
              value={formData.tipo}
              onChange={(value) => setFormData({ ...formData, tipo: value as any })}
              required
              options={[
                { value: 'envio_boletos', label: 'Envio de Boletos' },
                { value: 'remessa_bancaria', label: 'Remessa Bancária' },
                { value: 'verificar_vencimentos', label: 'Verificar Vencimentos' }
              ]}
            />
          </div>

          <div className="col-12">
            <label htmlFor="descricao" className="form-label">Descrição</label>
            <textarea
              id="descricao"
              className="form-control"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="col-12">
            <FormField
              name="frequencia"
              label="Frequência"
              type="select"
              value={formData.frequencia}
              onChange={(value) => setFormData({ ...formData, frequencia: value as any })}
              required
              options={[
                { value: 'diaria', label: 'Diária' },
                { value: 'semanal', label: 'Semanal' },
                { value: 'mensal', label: 'Mensal' }
              ]}
            />
          </div>

          <div className="col-12">
            <FormField
              name="hora_execucao"
              label="Horário de Execução"
              type="time"
              value={formData.hora_execucao}
              onChange={(value) => setFormData({ ...formData, hora_execucao: value })}
              required
            />
          </div>

          <div className="col-12">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="ativo">
                Ativo
              </label>
            </div>
          </div>

          <div className="col-12 mt-3">
            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default RotinaAgendadaModal;

