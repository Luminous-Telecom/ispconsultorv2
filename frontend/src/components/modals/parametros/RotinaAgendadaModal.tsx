import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { SchedulerService, type CreateRotinaData, type UpdateRotinaData } from '@/services/schedulerService';
import { SaasSchedulerService } from '@/services/saas/saasSchedulerService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { Button, Spinner } from '@/components/ui';
import FormField from '@/components/ui/FormField';

const TIPO_OPTIONS_ERP = [
  { value: 'geracao_titulos', label: 'Geração de Títulos' },
  { value: 'envio_boletos', label: 'Envio de Boletos' },
  { value: 'remessa_bancaria', label: 'Remessa Bancária' },
  { value: 'verificar_vencimentos', label: 'Verificar Vencimentos' },
  { value: 'desbloquear_blockdomi', label: 'Desbloquear domínios (data fim)' },
];

const TIPO_OPTIONS_SAAS = [
  { value: 'geracao_titulos', label: 'Geração de Títulos' },
  { value: 'envio_boletos', label: 'Envio de Boletos' },
  { value: 'remessa_bancaria', label: 'Remessa Bancária' },
];

const NOMES_POR_TIPO_ERP: Record<string, string> = {
  geracao_titulos: 'Geração de Títulos',
  envio_boletos: 'Envio de Boletos',
  remessa_bancaria: 'Remessa Bancária',
  verificar_vencimentos: 'Verificar Vencimentos',
  desbloquear_blockdomi: 'Desbloquear domínios (data fim)',
};

const NOMES_POR_TIPO_SAAS: Record<string, string> = {
  geracao_titulos: 'Geração de Títulos',
  envio_boletos: 'Envio de Boletos',
  remessa_bancaria: 'Remessa Bancária',
};

interface RotinaAgendadaModalProps {
  show: boolean;
  onClose: () => void;
  rotinaId?: number | null;
  onSuccess?: () => void;
  variant?: 'erp' | 'saas';
}

const RotinaAgendadaModal: React.FC<RotinaAgendadaModalProps> = ({
  show,
  onClose,
  rotinaId = null,
  onSuccess,
  variant = 'erp',
}) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const isEditMode = !!rotinaId;

  const schedulerService = variant === 'saas' ? SaasSchedulerService : SchedulerService;
  const queryKeyPrefix = variant === 'saas' ? 'saas' : '';
  const invalidateKey = variant === 'saas' ? 'saas-agendador-tarefas' : 'agendador-tarefas';
  const tipoOptions = variant === 'saas' ? TIPO_OPTIONS_SAAS : TIPO_OPTIONS_ERP;
  const nomesPorTipo = variant === 'saas' ? NOMES_POR_TIPO_SAAS : NOMES_POR_TIPO_ERP;
  const formId = variant === 'saas' ? 'saas-rotina-agendada-form' : 'rotina-agendada-form';
  const descricaoId = variant === 'saas' ? 'saas_descricao' : 'descricao';
  const ativoId = variant === 'saas' ? 'saas_ativo' : 'ativo';

  const [formData, setFormData] = useState<CreateRotinaData>({
    nome: 'Geração de Títulos',
    tipo: 'geracao_titulos',
    descricao: '',
    frequencia: 'diaria',
    hora_execucao: '00:00',
  });

  const [ativo, setAtivo] = useState(true);

  const { data: rotinaData, isLoading } = useQuery({
    queryKey: [queryKeyPrefix ? `${queryKeyPrefix}-rotina` : 'rotina', rotinaId],
    queryFn: async () => {
      const response = await schedulerService.getRotinaById(rotinaId!);
      return response.data;
    },
    enabled: isEditMode && !!rotinaId && show,
  });

  useEffect(() => {
    if (rotinaData && isEditMode) {
      setFormData({
        nome: rotinaData.nome || '',
        tipo: rotinaData.tipo || 'envio_boletos',
        descricao: rotinaData.descricao || '',
        frequencia: rotinaData.frequencia || 'diaria',
        hora_execucao: rotinaData.hora_execucao || '00:00',
      });
      setAtivo(rotinaData.ativo);
    }
  }, [rotinaData, isEditMode]);

  const createMutation = useMutation({
    mutationFn: (data: CreateRotinaData) => schedulerService.createRotina(data),
    onSuccess: () => {
      success('Rotina criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao criar rotina');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRotinaData) => schedulerService.updateRotina(rotinaId!, data),
    onSuccess: () => {
      success('Rotina atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix ? `${queryKeyPrefix}-rotina` : 'rotina', rotinaId] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao atualizar rotina');
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setFormData({
      nome: 'Geração de Títulos',
      tipo: 'geracao_titulos',
      descricao: '',
      frequencia: 'diaria',
      hora_execucao: '00:00',
    });
    setAtivo(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode) {
      const updateData: UpdateRotinaData = {
        ...formData,
        ativo,
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
      <DraggableModal show={show} onClose={handleClose} title="Rotina">
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label="Carregando..." />
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Rotina"
      size="lg"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" size="sm" disabled={isSaving}>
            Salvar
          </Button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <form id={formId} onSubmit={handleSubmit}>
          <div className="row g-0">
            <div className="col-12">
              <FormField
                name="tipo"
                label="Tipo"
                type="select"
                value={formData.tipo}
                onChange={(value) => {
                  const tipoValue = String(value ?? 'geracao_titulos') as CreateRotinaData['tipo'];
                  setFormData({
                    ...formData,
                    tipo: tipoValue,
                    nome: nomesPorTipo[tipoValue] || 'Rotina Personalizada',
                  });
                }}
                required
                options={tipoOptions}
              />
            </div>

            <div className="col-12">
              <label htmlFor={descricaoId} className="form-label">
                Descrição
              </label>
              <textarea
                id={descricaoId}
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
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    frequencia: String(value ?? 'diaria') as CreateRotinaData['frequencia'],
                  })
                }
                required
                options={[
                  { value: 'diaria', label: 'Diária' },
                  { value: 'semanal', label: 'Semanal' },
                  { value: 'mensal', label: 'Mensal' },
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
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={ativoId}
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label className="form-check-label" htmlFor={ativoId} style={{ cursor: 'pointer' }}>
                  Ativo
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default RotinaAgendadaModal;
