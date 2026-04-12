import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { SaasSchedulerService, type CreateRotinaData, type UpdateRotinaData } from 'services/saas/saasSchedulerService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import DraggableModal from 'components/common/DraggableModal';
import { Button, Spinner, FormField, AtivoInativoField } from 'components/ui';

const NOMES_POR_TIPO: Record<string, string> = {
  geracao_titulos: 'Geração de títulos',
  envio_boletos: 'Envio de boletos',
  remessa_bancaria: 'Remessa bancária',
  verificar_vencimentos: 'Verificar vencimentos',
  desbloquear_blockdomi: 'Desbloquear domínios (data fim)',
  bloquear_saas_atraso: 'Bloquear acesso por atraso',
  backup_equipamentos_ssh: 'Backup equipamentos SSH',
  outros: 'Outros',
};

function buildTipoOptionsSaaS(alvo: 'saas' | 'erp_global', hasBlockdomi: boolean) {
  if (alvo === 'saas') {
    return [
      { value: 'geracao_titulos', label: 'Geração de títulos (cobrança SaaS)' },
      { value: 'envio_boletos', label: 'Envio de boletos (cobrança SaaS)' },
      { value: 'remessa_bancaria', label: 'Remessa bancária (cobrança SaaS)' },
      { value: 'bloquear_saas_atraso', label: 'Bloquear acesso por atraso' },
    ];
  }
  const opts = [
    { value: 'geracao_titulos', label: 'Geração de títulos (ERP — todos os clientes)' },
    { value: 'envio_boletos', label: 'Envio de boletos (ERP — todos)' },
    { value: 'remessa_bancaria', label: 'Remessa bancária (ERP — todos)' },
    { value: 'verificar_vencimentos', label: 'Verificar vencimentos' },
    { value: 'desbloquear_blockdomi', label: 'Desbloquear domínios (data fim)' },
    { value: 'backup_equipamentos_ssh', label: 'Backup equipamentos SSH (ERP — todos)' },
    { value: 'outros', label: 'Outros' },
  ];
  if (!hasBlockdomi) return opts.filter((o) => o.value !== 'desbloquear_blockdomi');
  return opts;
}

const ALVO_OPTIONS_SAAS = [
  { value: 'saas', label: 'Cobrança do produto (SaaS)' },
  { value: 'erp_global', label: 'ERP — todos os clientes' },
];

interface RotinaAgendadaModalProps {
  show: boolean;
  onClose: () => void;
  rotinaId?: number | null;
  onSuccess?: () => void;
}

const RotinaAgendadaModal: React.FC<RotinaAgendadaModalProps> = ({ show, onClose, rotinaId = null, onSuccess }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();
  const isEditMode = !!rotinaId;

  const { hasModulo } = usePlanoModulos();
  const invalidateKey = 'saas-agendador-tarefas';

  const [formData, setFormData] = useState<CreateRotinaData>({
    nome: NOMES_POR_TIPO.geracao_titulos,
    tipo: 'geracao_titulos',
    alvo: 'saas',
    descricao: '',
    frequencia: 'diaria',
    hora_execucao: '00:00',
  });

  const [ativo, setAtivo] = useState(true);

  const tipoOptions = useMemo(() => {
    const alvo = (formData.alvo ?? 'saas') as 'saas' | 'erp_global';
    return buildTipoOptionsSaaS(alvo, hasModulo('blockdomi'));
  }, [formData.alvo, hasModulo]);

  const formId = 'saas-rotina-agendada-form';
  const descricaoId = 'saas_descricao';
  const ativoId = 'saas_ativo';

  const { data: rotinaData, isLoading } = useQuery({
    queryKey: ['saas-rotina', rotinaId],
    queryFn: async () => {
      const response = await SaasSchedulerService.getRotinaById(rotinaId!);
      return response.data;
    },
    enabled: isEditMode && !!rotinaId && show,
  });

  const resetForm = useCallback(() => {
    setFormData({
      nome: NOMES_POR_TIPO.geracao_titulos,
      tipo: 'geracao_titulos',
      alvo: 'saas',
      descricao: '',
      frequencia: 'diaria',
      hora_execucao: '00:00',
    });
    setAtivo(true);
  }, []);

  useEffect(() => {
    if (show && !rotinaId) {
      resetForm();
    }
  }, [show, rotinaId, resetForm]);

  useEffect(() => {
    if (rotinaData && isEditMode) {
      setFormData({
        nome: rotinaData.nome || '',
        tipo: rotinaData.tipo || 'geracao_titulos',
        alvo: (rotinaData.alvo ?? 'saas') as 'saas' | 'erp_global',
        descricao: rotinaData.descricao || '',
        frequencia: rotinaData.frequencia || 'diaria',
        hora_execucao: rotinaData.hora_execucao || '00:00',
      });
      setAtivo(rotinaData.ativo);
    }
  }, [rotinaData, isEditMode]);

  const createMutation = useMutation({
    mutationFn: (data: CreateRotinaData) => SaasSchedulerService.createRotina(data),
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
    mutationFn: (data: UpdateRotinaData) => SaasSchedulerService.updateRotina(rotinaId!, data),
    onSuccess: () => {
      success('Rotina atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      queryClient.invalidateQueries({ queryKey: ['saas-rotina', rotinaId] });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao atualizar rotina');
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode) {
      updateMutation.mutate({
        ...formData,
        ativo,
        alvo: formData.alvo ?? 'saas',
      });
    } else {
      createMutation.mutate({
        ...formData,
        alvo: formData.alvo ?? 'saas',
      });
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
                name="alvo"
                label="Escopo"
                type="select"
                value={formData.alvo ?? 'saas'}
                onChange={(value) => {
                  const alvoVal = (value === 'erp_global' ? 'erp_global' : 'saas') as 'saas' | 'erp_global';
                  const opts = buildTipoOptionsSaaS(alvoVal, hasModulo('blockdomi'));
                  const first = (opts[0]?.value ?? 'geracao_titulos') as CreateRotinaData['tipo'];
                  setFormData({
                    ...formData,
                    alvo: alvoVal,
                    tipo: first,
                    nome: NOMES_POR_TIPO[first] || formData.nome,
                  });
                }}
                required
                options={ALVO_OPTIONS_SAAS}
              />
            </div>
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
                    nome: NOMES_POR_TIPO[tipoValue] || 'Rotina Personalizada',
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
              <AtivoInativoField value={ativo} onChange={setAtivo} name={ativoId} />
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default RotinaAgendadaModal;
