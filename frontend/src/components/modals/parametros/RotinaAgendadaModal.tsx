import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { SaasSchedulerService, type CreateRotinaData, type UpdateRotinaData } from 'services/saas/saasSchedulerService';
import { useIsMobile } from 'hooks/useMediaQuery';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import DraggableModal from 'components/common/DraggableModal';
import { DeletarButton, FormField, ModalFormActions, NovoButton } from 'components/ui';
import CronFieldSection from './CronFieldSection';
import { useI18n } from 'contexts/I18nContext';
import {
  defaultCronParts,
  buildCreatePayloadWithCron,
  cronPartsFromRotina,
  validateCronPartsForSubmit,
  type CronPartState,
} from 'utils/cronFieldForm';

const NOMES_POR_TIPO: Record<string, string> = {
  geracao_titulos: 'Geração de títulos',
  envio_boletos: 'Envio de boletos',
  remessa_bancaria: 'Remessa bancária',
  verificar_vencimentos: 'Verificar vencimentos',
  desbloquear_blockdomi: 'Desbloquear domínios (data fim)',
  bloquear_saas_atraso: 'Bloquear acesso por atraso',
  backup_equipamentos_ssh: 'Backup equipamentos SSH',
  rpki_sync_parent_resources: 'RPKI: sincronizar recursos da CA-pai',
  rpki_sync_repositories: 'RPKI: sincronizar repositórios',
  consulta_titulos_asaas: 'Consulta títulos Asaas',
  consulta_titulos_efi: 'Consulta títulos Efi',
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
    { value: 'rpki_sync_parent_resources', label: 'RPKI: sincronizar recursos da CA-pai' },
    { value: 'rpki_sync_repositories', label: 'RPKI: sincronizar repositórios' },
    { value: 'consulta_titulos_asaas', label: 'Consulta títulos Asaas (ERP + SaaS)' },
    { value: 'consulta_titulos_efi', label: 'Consulta títulos Efi (ERP + SaaS)' },
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

const emptyForm = (): CreateRotinaData => ({
  nome: NOMES_POR_TIPO.geracao_titulos,
  tipo: 'geracao_titulos',
  alvo: 'saas',
});

const RotinaAgendadaModal: React.FC<RotinaAgendadaModalProps> = ({ show, onClose, rotinaId = null, onSuccess }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const isEditMode = !!rotinaId;

  const { hasModulo } = usePlanoModulos();
  const invalidateKey = 'saas-agendador-tarefas';

  const [formData, setFormData] = useState<CreateRotinaData>(emptyForm);
  const [cronParts, setCronParts] = useState<CronPartState[]>(() => defaultCronParts());

  const tipoOptions = useMemo(() => {
    const alvo = (formData.alvo ?? 'saas') as 'saas' | 'erp_global';
    return buildTipoOptionsSaaS(alvo, hasModulo('blockdomi'));
  }, [formData.alvo, hasModulo]);

  const cronRowLabels = useMemo(
    () => [
      t('scheduler.cronFormMinute'),
      t('scheduler.cronFormHour'),
      t('scheduler.cronFormDayMonth'),
      t('scheduler.cronFormMonth'),
      t('scheduler.cronFormDayWeek'),
    ],
    [t]
  );

  const formId = 'saas-rotina-agendada-form';

  const { data: rotinaData, isLoading } = useQuery({
    queryKey: ['saas-rotina', rotinaId],
    queryFn: async () => {
      const response = await SaasSchedulerService.getRotinaById(rotinaId!);
      return response.data;
    },
    enabled: isEditMode && !!rotinaId && show,
  });

  const resetForm = useCallback(() => {
    setFormData(emptyForm());
    setCronParts(defaultCronParts());
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
      });
      setCronParts(cronPartsFromRotina(rotinaData));
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
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRotinaData) => SaasSchedulerService.updateRotina(rotinaId!, data),
    onSuccess: () => {
      success('Rotina atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      queryClient.invalidateQueries({ queryKey: ['saas-rotina', rotinaId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_UPDATE_ERROR),
  });

  const deleteMutation = useMutation({
    mutationFn: () => SaasSchedulerService.deleteRotina(rotinaId!),
    onSuccess: () => {
      success('Rotina deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      resetForm();
      onClose();
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.ROTINA_DELETE_ERROR),
  });

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const buildSubmitPayload = useCallback((): CreateRotinaData => {
    return buildCreatePayloadWithCron(
      {
        nome: formData.nome,
        tipo: formData.tipo,
        alvo: formData.alvo ?? 'saas',
      },
      cronParts
    );
  }, [formData, cronParts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const err = validateCronPartsForSubmit(cronParts);
    if (err) {
      showApiError(err);
      return;
    }

    const payload = buildSubmitPayload();

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (!rotinaId || !isEditMode) return;
    if (!window.confirm(t('scheduler.confirmDeleteRoutine'))) return;
    deleteMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNovo = () => {
    resetForm();
  };

  if (isLoading) {
    return (
      <DraggableModal show={show} onClose={handleClose} title={t('scheduler.formModalTitle')} size="lg">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
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
      title={t('scheduler.formModalTitle')}
      size="lg"
      modalId="saas-rotina-agendada-form-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <ModalFormActions
            className="d-flex gap-2"
            onCancel={handleClose}
            formId={formId}
            isPending={isSaving}
          />
          {!isEditMode && (
            <NovoButton type="button" onClick={handleNovo} isPending={isSaving} />
          )}
          {isEditMode && (
            <DeletarButton type="button" onClick={handleDelete} isPending={isSaving} />
          )}
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="form-modal-simple"
        style={{ padding: isMobile ? '0' : '16px', paddingBottom: isMobile ? 0 : 24 }}
      >
        <div className="d-flex flex-column gap-2">
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <FormField
                name="alvo"
                label={t('scheduler.scope')}
                type="select"
                size="md"
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
            <div className="col-12 col-md-6">
              <FormField
                name="tipo"
                label={t('scheduler.type')}
                type="select"
                size="md"
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
          </div>
          {cronRowLabels.map((label, idx) => (
            <CronFieldSection
              key={`cron-part-${idx}`}
              idPrefix={`${formId}-cron-${idx}`}
              label={label}
              mode={cronParts[idx]?.mode ?? 'todos'}
              valor={cronParts[idx]?.valor ?? ''}
              onModeChange={(mode) => {
                setCronParts((prev) => {
                  const next = [...prev];
                  const cur = prev[idx] ?? { mode: 'todos' as const, valor: '' };
                  next[idx] = {
                    ...cur,
                    mode,
                    valor: mode === 'todos' ? '' : cur.valor,
                  };
                  return next;
                });
              }}
              onValorChange={(v) => {
                setCronParts((prev) => {
                  const next = [...prev];
                  const cur = prev[idx] ?? { mode: 'todos' as const, valor: '' };
                  next[idx] = { ...cur, valor: v };
                  return next;
                });
              }}
              disabled={isSaving}
              labelTipo={t('scheduler.cronLabelTipo')}
              labelValorField={t('scheduler.cronLabelValorField')}
              labelTodos={t('scheduler.cronOptionAll')}
              labelValor={t('scheduler.cronOptionValue')}
            />
          ))}
        </div>
      </form>
    </DraggableModal>
  );
};

export default RotinaAgendadaModal;
