import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { saasContratoService, saasDiasVencimentoService, type SaasContrato } from '@/services/saas/saasCrudService';
import { saasPlanoService } from '@/services/saas/saasPlanoService';
import { saasBancoService } from '@/services/saas/saasConfigService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; empresaId: number; }

interface Form {
  banco_id: number | '';
  dia_vencimento: number | '';
  plano_id: number | '';
  data_inicio: string;
  data_fim: string;
  tipo: 'mensal' | 'anual';
  valor: number | '';
  observacoes: string;
}

const INITIAL: Form = { banco_id: '', dia_vencimento: '', plano_id: '', data_inicio: '', data_fim: '', tipo: 'mensal', valor: '', observacoes: '' };

const SaasContratoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId, empresaId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!itemId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const { data } = useQuery({
    queryKey: ['saas-contrato', itemId],
    queryFn: () => saasContratoService.getById(itemId!),
    enabled: show && !!itemId,
  });

  const { data: planosRes } = useQuery({
    queryKey: ['saas-planos-select'],
    queryFn: () => saasPlanoService.list(),
    enabled: show,
  });

  const { data: bancosRes } = useQuery({
    queryKey: ['saas-bancos-select', empresaId],
    queryFn: () => saasBancoService.list({ empresa_id: empresaId, ativo: true, limit: 500 }),
    enabled: show && !!empresaId,
  });

  const { data: diasRes } = useQuery({
    queryKey: ['saas-dias-vencimento-config', empresaId],
    queryFn: () => saasDiasVencimentoService.getConfig(empresaId),
    enabled: show && !!empresaId,
  });

  const planos = useMemo(() => (Array.isArray((planosRes as { data?: unknown[] })?.data) ? (planosRes as { data: unknown[] }).data : []) as { id: number; nome: string; valor_mensal?: number; valor_anual?: number }[], [planosRes]);

  const bancosAtivos = useMemo(() => {
    const raw = bancosRes?.data as { data?: { id: number; nome?: string; banco: string; ativo?: boolean }[]; pagination?: { total: number } } | undefined;
    const list = raw?.data ?? [];
    return list.filter((b) => b.ativo !== false) as { id: number; nome?: string; banco: string }[];
  }, [bancosRes]);

  const diasOptions = useMemo(() => {
    const data = (diasRes as { data?: unknown } | undefined)?.data;
    const list = Array.isArray(data) ? data : ((data as { data?: unknown[] })?.data ?? []) as { dia?: number; dia_padrao?: number }[];
    return list.map((r) => {
      const d = r.dia ?? r.dia_padrao ?? 10;
      return { value: String(d), label: `Dia ${d}` };
    });
  }, [diasRes]);

  useEffect(() => {
    if (!show || isEditing || !form.plano_id) return;
    const plano = planos.find(p => p.id === form.plano_id);
    if (!plano) return;
    const valorMensal = Number(plano.valor_mensal) || 0;
    const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
    const valor = form.tipo === 'anual' ? valorAnual : valorMensal;
    if (valor > 0) setForm(p => ({ ...p, valor }));
  }, [show, isEditing, form.plano_id, form.tipo, planos]);

  useFormReset({ show: show && !isEditing, initialData: { ...INITIAL, data_inicio: new Date().toISOString().slice(0, 10) }, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing, initialData: INITIAL, setFormData: setForm, setErrors,
    customData: data?.data ? (() => {
      const d = data.data as unknown as SaasContrato;
      return {
        banco_id: d.banco_id ?? '',
        dia_vencimento: d.dia_vencimento ?? '',
        plano_id: d.plano_id,
        data_inicio: d.data_inicio ? String(d.data_inicio).slice(0, 10) : '',
        data_fim: d.data_fim ? String(d.data_fim).slice(0, 10) : '',
        tipo: d.tipo ?? 'mensal',
        valor: d.valor ?? '',
        observacoes: d.observacoes ?? '',
      } as Form;
    })() : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasContrato>) => saasContratoService.create(d),
    onSuccess: () => { success(t('messages.success')); queryClient.invalidateQueries({ queryKey: ['saas-contratos'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasContrato>) => saasContratoService.update(itemId!, d),
    onSuccess: () => { success(t('messages.success')); queryClient.invalidateQueries({ queryKey: ['saas-contratos'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (form.plano_id === '') errs.plano_id = t('form.required');
    if (!form.data_inicio.trim()) errs.data_inicio = t('form.required');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      const payload: Partial<SaasContrato> = {
        empresa_id: empresaId,
        banco_id: form.banco_id ? Number(form.banco_id) : null,
        dia_vencimento: form.dia_vencimento ? Number(form.dia_vencimento) : null,
        plano_id: Number(form.plano_id),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        tipo: form.tipo,
        valor: form.valor === '' ? 0 : Number(form.valor),
        observacoes: form.observacoes || null,
      };
      if (isEditing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
    } catch { /* tratado no mutation */ }
  };

  const planoOptions = (planos as { id: number; nome: string }[]).map(p => ({ value: String(p.id), label: p.nome }));
  const bancoOptions = bancosAtivos.map(b => ({ value: String(b.id), label: b.nome || b.banco }));

  return (
    <DraggableModal show={show} onClose={onClose} title={isEditing ? `${t('actions.edit')} ${t('nav.contracts')}` : `${t('actions.create')} ${t('nav.contracts')}`} size="md" modalId="saas-contrato-form"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>{t('buttons.cancel')}</Button>
          <Button type="submit" form="saas-contrato-form-id" variant="primary" size="sm" disabled={isPending}>{t('buttons.save')}</Button>
        </div>
      }
    >
      <form id="saas-contrato-form-id" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row g-2">
          <div className="col-md-12">
            <FormField name="banco_id" type="select" label={`${t('menu.banks')}`}
              value={String(form.banco_id)}
              onChange={v => { setForm(p => ({ ...p, banco_id: v ? Number(v) : '' })); if (errors.banco_id) setErrors(e => ({ ...e, banco_id: undefined })); }}
              options={[{ value: '', label: '—' }, ...bancoOptions]} size="md" error={errors.banco_id} />
          </div>
          {diasOptions.length > 0 && (
            <div className="col-md-12">
              <FormField name="dia_vencimento" type="select" label={t('form.dueDay')}
                value={String(form.dia_vencimento)}
                onChange={v => setForm(p => ({ ...p, dia_vencimento: v ? Number(v) : '' }))}
                options={[{ value: '', label: '—' }, ...diasOptions]} size="md" />
            </div>
          )}
          <div className="col-md-12">
            <FormField name="plano_id" type="select" label={`${t('form.plan')} *`} value={String(form.plano_id)}
              onChange={v => {
                const planoId: Form['plano_id'] = v ? Number(v) : '';
                setForm(prev => {
                  const next: Form = { ...prev, plano_id: planoId };
                  if (planoId && planos.length) {
                    const plano = (planos as { id: number; valor_mensal?: number; valor_anual?: number }[]).find(p => p.id === planoId);
                    if (plano) {
                      const valorMensal = Number(plano.valor_mensal) || 0;
                      const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
                      next.valor = prev.tipo === 'anual' ? valorAnual : valorMensal;
                    }
                  } else {
                    next.valor = '';
                  }
                  return next;
                });
                if (errors.plano_id) setErrors(e => ({ ...e, plano_id: undefined }));
              }}
              options={[{ value: '', label: '—' }, ...planoOptions]} required size="md" error={errors.plano_id} />
          </div>
          <div className="col-md-6">
            <FormField name="data_inicio" type="date" label={`${t('form.startDate')} *`} value={form.data_inicio}
              onChange={v => setForm(p => ({ ...p, data_inicio: String(v ?? '') }))} required size="md" error={errors.data_inicio} />
          </div>
          <div className="col-md-6">
            <FormField name="data_fim" type="date" label={t('form.endDate')} value={form.data_fim}
              onChange={v => setForm(p => ({ ...p, data_fim: String(v ?? '') }))} size="md" />
          </div>
          <div className="col-md-6">
            <FormField name="tipo" type="select" label={t('form.type')} value={form.tipo}
              onChange={v => {
                const novoTipo = (v as 'mensal' | 'anual') || 'mensal';
                setForm(prev => {
                  const next = { ...prev, tipo: novoTipo };
                  if (prev.plano_id && planos.length) {
                    const plano = (planos as { id: number; valor_mensal?: number; valor_anual?: number }[]).find(p => p.id === prev.plano_id);
                    if (plano) {
                      const valorMensal = Number(plano.valor_mensal) || 0;
                      const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
                      next.valor = novoTipo === 'anual' ? valorAnual : valorMensal;
                    }
                  }
                  return next;
                });
              }}
              options={[{ value: 'mensal', label: t('form.periodicityMonthly') ?? 'Mensal' }, { value: 'anual', label: t('form.periodicityAnnual') ?? 'Anual' }]} size="md" />
          </div>
          <div className="col-md-6">
            <FormField name="valor" type="number" label={t('form.value')} value={form.valor === '' ? '' : form.valor}
              onChange={v => setForm(p => ({ ...p, valor: v !== '' && v != null ? Number(v) : '' }))}
              min={0} step={0.01} size="md" />
          </div>
          <div className="col-md-12">
            <FormField name="observacoes" type="textarea" label={t('form.observations')} value={form.observacoes}
              onChange={v => setForm(p => ({ ...p, observacoes: String(v ?? '') }))} size="md" />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default SaasContratoFormModal;
