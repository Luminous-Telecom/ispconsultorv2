import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { saasTituloService, type SaasTitulo } from '@/services/saas/saasCrudService';
import { saasPlanoService } from '@/services/saas/saasPlanoService';
import { saasBancoService } from '@/services/saas/saasConfigService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; empresaId: number; }

interface Form {
  plano_id: number | '';
  banco_id: number | '';
  valor: number | '';
  data_vencimento: string;
  descricao: string;
}

const INITIAL: Form = { plano_id: '', banco_id: '', valor: '', data_vencimento: '', descricao: '' };

const gerarNumeroTitulo = () => `TIT-SAAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const SaasTituloFormModal: React.FC<Props> = ({ show, onClose, onSuccess, empresaId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

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

  const planos = useMemo(() => (Array.isArray((planosRes as { data?: unknown[] })?.data) ? (planosRes as { data: unknown[] }).data : []) as { id: number; nome: string; valor_mensal?: number }[], [planosRes]);

  const bancosAtivos = useMemo(() => {
    const raw = bancosRes?.data as { data?: { id: number; nome?: string; banco: string; ativo?: boolean }[] } | undefined;
    const list = raw?.data ?? [];
    return list.filter((b) => b.ativo !== false) as { id: number; nome?: string; banco: string }[];
  }, [bancosRes]);

  const defaultDataVencimento = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  useFormReset({ show, initialData: { ...INITIAL, data_vencimento: defaultDataVencimento }, setFormData: setForm, setErrors });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasTitulo>) => saasTituloService.create(d),
    onSuccess: () => {
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      onSuccess?.();
      onClose();
    },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });

  const isPending = createMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (form.plano_id === '') errs.plano_id = t('form.required');
    if (form.banco_id === '') errs.banco_id = t('form.required');
    if (form.valor === '' || Number(form.valor) < 0.01) errs.valor = t('form.required');
    if (!form.data_vencimento.trim()) errs.data_vencimento = t('form.required');
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
    } catch { /* tratado no mutation */ }
  };

  const planoOptions = (planos as { id: number; nome: string }[]).map((p) => ({ value: String(p.id), label: p.nome }));
  const bancoOptions = bancosAtivos.map((b) => ({ value: String(b.id), label: b.nome || b.banco }));

  return (
    <DraggableModal show={show} onClose={onClose} title={`${t('actions.create')} ${t('modal.createTitle')}`} size="md" modalId="saas-titulo-form"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>{t('buttons.cancel')}</Button>
          <Button type="submit" form="saas-titulo-form-id" variant="primary" size="sm" disabled={isPending}>{t('buttons.save')}</Button>
        </div>
      }
    >
      <form id="saas-titulo-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-2">
          <div className="col-md-12">
            <FormField name="plano_id" type="select" label={`${t('form.plan')} *`} value={String(form.plano_id)}
              onChange={(v) => { setForm((p) => ({ ...p, plano_id: v ? Number(v) : '' })); if (errors.plano_id) setErrors((e) => ({ ...e, plano_id: undefined })); }}
              options={[{ value: '', label: '—' }, ...planoOptions]} required size="md" error={errors.plano_id} />
          </div>
          <div className="col-md-12">
            <FormField name="banco_id" type="select" label={`${t('menu.banks')} *`} value={String(form.banco_id)}
              onChange={(v) => { setForm((p) => ({ ...p, banco_id: v ? Number(v) : '' })); if (errors.banco_id) setErrors((e) => ({ ...e, banco_id: undefined })); }}
              options={[{ value: '', label: '—' }, ...bancoOptions]} required size="md" error={errors.banco_id} />
          </div>
          <div className="col-md-6">
            <FormField name="valor" type="number" label={`${t('form.value')} *`} value={form.valor === '' ? '' : form.valor}
              onChange={(v) => setForm((p) => ({ ...p, valor: v !== '' && v != null ? Number(v) : '' }))}
              min={0.01} step={0.01} required size="md" error={errors.valor} />
          </div>
          <div className="col-md-6">
            <FormField name="data_vencimento" type="date" label={`${t('form.dueDate')} *`} value={form.data_vencimento}
              onChange={(v) => setForm((p) => ({ ...p, data_vencimento: String(v ?? '') }))} required size="md" error={errors.data_vencimento} />
          </div>
          <div className="col-md-12">
            <FormField name="descricao" type="text" label={t('table.description')} value={form.descricao}
              onChange={(v) => setForm((p) => ({ ...p, descricao: String(v ?? '') }))} size="md" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasTituloFormModal;
