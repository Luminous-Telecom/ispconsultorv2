import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { saasTituloService, type SaasTitulo } from 'services/saas/saasCrudService';
import { saasPlanoService } from 'services/saas/saasPlanoService';
import { saasBancoService } from 'services/saas/saasConfigService';
import SaasTituloFormFields, { type SaasTituloFormData } from './SaasTituloFormFields';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  empresaId: number;
}

const INITIAL: SaasTituloFormData = {
  plano_id: '',
  banco_id: '',
  valor: '',
  data_vencimento: '',
  descricao: '',
};

const gerarNumeroTitulo = () => `TIT-SAAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const SaasTituloFormModal: React.FC<Props> = ({ show, onClose, onSuccess, empresaId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [form, setForm] = useState<SaasTituloFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof SaasTituloFormData, string>>>({});

  const { data: planosRes } = useQuery({
    queryKey: ['saas-planos-select'],
    queryFn: () => saasPlanoService.list(),
    enabled: show,
  });

  const { data: bancosRes } = useQuery({
    queryKey: ['saas-bancos-titulo', empresaId],
    queryFn: () => saasBancoService.list({ ativo: true, limit: 500 }),
    enabled: show && !!empresaId,
  });

  const planos = useMemo(
    () =>
      (Array.isArray((planosRes as { data?: unknown[] })?.data)
        ? (planosRes as { data: unknown[] }).data
        : []) as { id: number; nome: string; valor_mensal?: number }[],
    [planosRes]
  );

  const bancosAtivos = useMemo(() => {
    const raw = bancosRes?.data as
      | { data?: { id: number; nome?: string; banco: string; ativo?: boolean }[] }
      | undefined;
    const list = raw?.data ?? [];
    return list.filter((b) => b.ativo !== false) as { id: number; nome?: string; banco: string }[];
  }, [bancosRes]);

  const defaultDataVencimento = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  useFormReset({
    show,
    initialData: { ...INITIAL, data_vencimento: defaultDataVencimento },
    setFormData: setForm,
    setErrors,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasTitulo>) => saasTituloService.create(d),
    onSuccess: () => {
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_CREATE_ERROR),
  });

  const isPending = createMutation.isPending;

  const handleChange = useCallback(
    <K extends keyof SaasTituloFormData>(field: K, value: SaasTituloFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof SaasTituloFormData, string>> = {};
    if (form.plano_id === '') errs.plano_id = t('form.required');
    if (form.banco_id === '') errs.banco_id = t('form.required');
    if (form.valor === '' || Number(form.valor) < 0.01) errs.valor = t('form.required');
    if (!form.data_vencimento.trim()) errs.data_vencimento = t('form.required');
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      const payload: Partial<SaasTitulo> = {
        empresa_id: empresaId,
        plano_id: Number(form.plano_id),
        banco_id: Number(form.banco_id),
        contrato_id: null,
        numero_titulo: gerarNumeroTitulo(),
        valor: Number(form.valor),
        data_vencimento: form.data_vencimento,
        descricao: form.descricao.trim() || null,
        is_avulso: true,
      };
      await createMutation.mutateAsync(payload);
    } catch {
      // tratado no mutation
    }
  };

  const planoOptions = planos.map((p) => ({ value: String(p.id), label: p.nome }));
  const bancoOptions = bancosAtivos.map((b) => ({
    value: String(b.id),
    label: b.nome || b.banco,
  }));

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.createTitle')}
      size="md"
      modalId="saas-titulo-form"
      headerActions={
        <ModalFormActions onCancel={onClose} formId="saas-titulo-form-id" isPending={isPending} />
      }
    >
      <form id="saas-titulo-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <SaasTituloFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          planoOptions={planoOptions}
          bancoOptions={bancoOptions}
          disabled={isPending}
        />
      </form>
    </DraggableModal>
  );
};

export default SaasTituloFormModal;
