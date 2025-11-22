import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { SchedulerService, CreateRotinaData, UpdateRotinaData } from '@/services/schedulerService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import DraggableModal from '../../common/DraggableModal';
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
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const isEditMode = !!rotinaId;

  const [formData, setFormData] = useState<CreateRotinaData>({
    nome: 'Geração de Títulos', // Gerado automaticamente baseado no tipo
    tipo: 'geracao_titulos',
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
        nome: rotinaData.nome || '', // Mantido no estado mas não exibido no formulário
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
      success( 'Rotina criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError( axiosError?.response?.data?.message || 'Erro ao criar rotina');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRotinaData) => SchedulerService.updateRotina(rotinaId!, data),
    onSuccess: () => {
      success( 'Rotina atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['agendador-tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['rotina', rotinaId] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError( axiosError?.response?.data?.message || 'Erro ao atualizar rotina');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: 'Geração de Títulos', // Gerado automaticamente baseado no tipo
      tipo: 'geracao_titulos',
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
      <div style={{ padding: '1rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
          <div className="col-12">
            <FormField
              name="tipo"
              label="Tipo"
              type="select"
              value={formData.tipo}
              onChange={(value) => {
                const tipoValue = String(value ?? 'geracao_titulos') as CreateRotinaData['tipo'];
                // Gerar nome automaticamente baseado no tipo
                const nomesPorTipo: Record<string, string> = {
                  'geracao_titulos': 'Geração de Títulos',
                  'envio_boletos': 'Envio de Boletos',
                  'remessa_bancaria': 'Remessa Bancária',
                  'verificar_vencimentos': 'Verificar Vencimentos'
                };
                setFormData({ 
                  ...formData, 
                  tipo: tipoValue,
                  nome: nomesPorTipo[tipoValue] || 'Rotina Personalizada'
                });
              }}
              required
              options={[
                { value: 'geracao_titulos', label: 'Geração de Títulos' },
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
              onChange={(value) => setFormData({ ...formData, frequencia: String(value ?? 'diaria') as CreateRotinaData['frequencia'] })}
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
              onChange={(value) => setFormData({ ...formData, hora_execucao: String(value ?? '00:00') })}
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
      </div>
    </DraggableModal>
  );
};

export default RotinaAgendadaModal;

