import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { saasPlanoService, type SaasPlano } from '@/services/saas/saasPlanoService';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null;
}

interface PlanoForm {
  nome: string;
  descricao: string;
  valor_mensal: number;
  valor_anual: number | '';
  limite_usuarios: number;
  ativo: boolean;
}

const INITIAL: PlanoForm = {
  nome: '',
  descricao: '',
  valor_mensal: 0,
  valor_anual: '',
  limite_usuarios: 5,
  ativo: true,
};

const SaasPlanoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, planoId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!planoId;
  const [form, setForm] = useState<PlanoForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof PlanoForm, string>>>({});

  const { data: planoData } = useQuery({
    queryKey: ['saas-plano', planoId],
    queryFn: () => saasPlanoService.getById(planoId!),
    enabled: show && !!planoId,
  });

  useFormReset({
    show: show && !isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
  });

  useFormReset({
    show: show && isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
    customData: planoData?.data
      ? {
          nome: (planoData.data as SaasPlano).nome,
          descricao: (planoData.data as SaasPlano).descricao || '',
          valor_mensal: (planoData.data as SaasPlano).valor_mensal,
          valor_anual: (planoData.data as SaasPlano).valor_anual ?? '',
          limite_usuarios: (planoData.data as SaasPlano).limite_usuarios,
          ativo: (planoData.data as SaasPlano).ativo,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.create(data),
    onSuccess: () => {
      success('Plano criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao criar plano';
      error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SaasPlano>) => saasPlanoService.update(planoId!, data),
    onSuccess: () => {
      success('Plano atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
      queryClient.invalidateQueries({ queryKey: ['saas-plano', planoId] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao atualizar plano';
      error(msg);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof PlanoForm, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (form.valor_mensal < 0) newErrors.valor_mensal = 'Valor mensal inválido';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});

    const payload: Partial<SaasPlano> = {
      nome: form.nome,
      descricao: form.descricao,
      valor_mensal: form.valor_mensal,
      valor_anual: form.valor_anual !== '' ? Number(form.valor_anual) : undefined,
      limite_usuarios: form.limite_usuarios,
      ativo: form.ativo,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      // tratado no mutation
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('modal.editPlan') : t('modal.createPlan')}
      size="lg"
      modalId="saas-plano-form-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>
            {t('buttons.cancel')}
          </Button>
          <Button type="submit" form="saas-plano-form" variant="primary" size="sm" disabled={isPending}>
            {t('buttons.save')}
          </Button>
        </div>
      }
    >
      <form id="saas-plano-form" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-1">
          <div className="col-md-8">
            <FormField
              name="nome"
              type="text"
              label={`${t('table.planName')} *`}
              value={form.nome}
              onChange={(v) => { setForm(p => ({ ...p, nome: String(v ?? '') })); if (errors.nome) setErrors(p => ({ ...p, nome: undefined })); }}
              required
              size="sm"
              error={errors.nome}
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="ativo"
              type="checkbox"
              label={form.ativo ? t('status.active') : t('status.inactive')}
              value={form.ativo}
              onChange={(v) => setForm(p => ({ ...p, ativo: Boolean(v) }))}
              switch
              size="sm"
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="valor_mensal"
              type="number"
              label="Valor Mensal (R$) *"
              value={form.valor_mensal}
              onChange={(v) => { setForm(p => ({ ...p, valor_mensal: Number(v ?? 0) })); if (errors.valor_mensal) setErrors(p => ({ ...p, valor_mensal: undefined })); }}
              min={0}
              step={0.01}
              required
              size="sm"
              error={errors.valor_mensal}
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="valor_anual"
              type="number"
              label="Valor Anual (R$)"
              value={form.valor_anual === '' ? '' : form.valor_anual}
              onChange={(v) => setForm(p => ({ ...p, valor_anual: v !== '' && v !== null && v !== undefined ? Number(v) : '' }))}
              min={0}
              step={0.01}
              size="sm"
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="limite_usuarios"
              type="number"
              label="Limite de Usuários"
              value={form.limite_usuarios}
              onChange={(v) => setForm(p => ({ ...p, limite_usuarios: Number(v ?? 5) }))}
              min={1}
              size="sm"
            />
          </div>
          <div className="col-12">
            <FormField
              name="descricao"
              type="textarea"
              label={t('form.description')}
              value={form.descricao}
              onChange={(v) => setForm(p => ({ ...p, descricao: String(v ?? '') }))}
              rows={3}
              size="sm"
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasPlanoFormModal;
