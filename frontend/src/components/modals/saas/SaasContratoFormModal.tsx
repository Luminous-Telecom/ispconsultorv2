import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { saasContratoService, saasDiasVencimentoService, type SaasContrato } from 'services/saas/saasCrudService';
import { saasEmpresasService } from 'services/saas/saasEmpresasService';
import { saasPlanoService } from 'services/saas/saasPlanoService';
import { saasBancoService } from 'services/saas/saasConfigService';
import SaasPlanoListModal from './SaasPlanoListModal';
import SaasBancosModal from './SaasBancosModal';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; empresaId: number; dataFimDesbloqueioManual?: string | null; }

interface Form {
  banco_id: number | '';
  dia_vencimento: number | '';
  plano_id: number | '';
  data_inicio: string;
  data_fim: string;
  tipo: 'mensal' | 'anual';
  valor: number | '';
  desconto_percentual: number;
  desconto_valor: number;
  data_validade_desconto: string;
  isento_mensalidade: boolean;
  observacoes: string;
  data_fim_desbloqueio_manual: string;
}

const INITIAL: Form = { banco_id: '', dia_vencimento: '', plano_id: '', data_inicio: '', data_fim: '', tipo: 'mensal', valor: '', desconto_percentual: 0, desconto_valor: 0, data_validade_desconto: '', isento_mensalidade: false, observacoes: '', data_fim_desbloqueio_manual: '' };

const SaasContratoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId, empresaId, dataFimDesbloqueioManual }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isEditing = !!itemId;
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [showPlanoSelectModal, setShowPlanoSelectModal] = useState(false);
  const [showBancoSelectModal, setShowBancoSelectModal] = useState(false);
  const [descontoPercentualDisplay, setDescontoPercentualDisplay] = useState('');
  const [descontoValorDisplay, setDescontoValorDisplay] = useState('');

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
    queryKey: ['saas-bancos-select'],
    queryFn: () => saasBancoService.list({ ativo: true, limit: 500 }),
    enabled: show,
  });

  const { data: diasRes } = useQuery({
    queryKey: ['saas-dias-vencimento-config'],
    queryFn: () => saasDiasVencimentoService.getConfig(),
    enabled: show,
  });

  const planos = useMemo(() => (Array.isArray((planosRes as { data?: unknown[] })?.data) ? (planosRes as { data: unknown[] }).data : []) as { id: number; nome: string; valor_mensal?: number; valor_anual?: number }[], [planosRes]);

  const bancosAtivos = useMemo(() => {
    const raw = bancosRes?.data as { data?: { id: number; nome?: string; banco: string; ativo?: boolean }[]; pagination?: { total: number } } | undefined;
    const list = raw?.data ?? [];
    return list.filter((b) => b.ativo !== false) as { id: number; nome?: string; banco: string }[];
  }, [bancosRes]);

  const diasVencimentoList = useMemo(() => {
    const data = (diasRes as { data?: unknown } | undefined)?.data;
    const list = Array.isArray(data) ? data : ((data as { data?: unknown[] })?.data ?? []) as { id?: number; dia?: number; dia_padrao?: number; ativo?: boolean }[];
    return list.filter((r) => r.ativo === true).map((r) => ({ id: r.id ?? 0, dia: r.dia ?? r.dia_padrao ?? 10 }));
  }, [diasRes]);

  const valorPlanoBase = useMemo(() => {
    if (!form.plano_id) return 0;
    const plano = planos.find(p => p.id === form.plano_id);
    if (!plano) return 0;
    const valorMensal = Number(plano.valor_mensal) || 0;
    const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
    return form.tipo === 'anual' ? valorAnual : valorMensal;
  }, [form.plano_id, form.tipo, planos]);

  useEffect(() => {
    if (!show || isEditing || !form.plano_id) return;
    if (form.isento_mensalidade) {
      setForm(p => ({ ...p, valor: 0 }));
      return;
    }
    const base = valorPlanoBase;
    const descVal = form.desconto_valor || 0;
    const descPct = form.desconto_percentual || 0;
    const desconto = descVal > 0 ? descVal : (base * descPct / 100);
    const valor = Math.max(0, Math.round((base - desconto) * 100) / 100);
    setForm(p => (p.valor === '' || Number(p.valor) !== valor ? { ...p, valor } : p));
  }, [show, isEditing, form.plano_id, form.tipo, form.isento_mensalidade, form.desconto_valor, form.desconto_percentual, valorPlanoBase]);

  useFormReset({
    show: show && !isEditing,
    initialData: { ...INITIAL, data_inicio: new Date().toISOString().slice(0, 10) },
    setFormData: setForm,
    setErrors,
  });
  useFormReset({
    show: show && isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors,
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
        desconto_percentual: Number(d.desconto_percentual) || 0,
        desconto_valor: Number(d.desconto_valor) || 0,
        data_validade_desconto: d.data_validade_desconto ? String(d.data_validade_desconto).slice(0, 10) : '',
        isento_mensalidade: d.isento_mensalidade ?? false,
        observacoes: d.observacoes ?? '',
        data_fim_desbloqueio_manual: (dataFimDesbloqueioManual ?? '').toString().slice(0, 10),
      } as Form;
    })() : undefined,
  });
  useEffect(() => {
    setDescontoPercentualDisplay(form.desconto_percentual > 0 ? String(form.desconto_percentual) : '');
  }, [form.desconto_percentual]);
  useEffect(() => {
    setDescontoValorDisplay(form.desconto_valor > 0 ? String(form.desconto_valor) : '');
  }, [form.desconto_valor]);
  useEffect(() => {
    if (show && dataFimDesbloqueioManual !== undefined) {
      setForm(p => ({ ...p, data_fim_desbloqueio_manual: dataFimDesbloqueioManual ?? '' }));
    }
  }, [show, dataFimDesbloqueioManual]);

  const handleDescontoPercentualChange = (v: unknown) => {
    const s = String(v ?? '').trim();
    setDescontoPercentualDisplay(s);
    if (!s) {
      setForm(p => ({ ...p, desconto_percentual: 0, desconto_valor: 0 }));
      setDescontoValorDisplay('');
      return;
    }
    const pct = Math.round(Number(s) * 100) / 100;
    if (isNaN(pct)) return;
    setForm(prev => {
      const next = { ...prev, desconto_percentual: pct };
      if (pct > 0 && valorPlanoBase > 0) {
        const val = Math.round((valorPlanoBase * pct / 100) * 100) / 100;
        next.desconto_valor = val;
        setDescontoValorDisplay(String(val));
      } else {
        next.desconto_valor = 0;
        setDescontoValorDisplay('');
      }
      return next;
    });
  };

  const handleDescontoValorChange = (v: unknown) => {
    const s = String(v ?? '').trim();
    setDescontoValorDisplay(s);
    if (!s) {
      setForm(p => ({ ...p, desconto_valor: 0, desconto_percentual: 0 }));
      setDescontoPercentualDisplay('');
      return;
    }
    const val = Math.round(Number(s) * 100) / 100;
    if (isNaN(val)) return;
    setForm(prev => {
      const next = { ...prev, desconto_valor: val };
      if (val > 0 && valorPlanoBase > 0) {
        const pct = Math.round((val / valorPlanoBase * 100) * 100) / 100;
        next.desconto_percentual = pct;
        setDescontoPercentualDisplay(String(pct));
      } else {
        next.desconto_percentual = 0;
        setDescontoPercentualDisplay('');
      }
      return next;
    });
  };

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
  const updateDataFimMutation = useMutation({
    mutationFn: (payload: { empresaId: number; data_fim_desbloqueio_manual: string | null }) =>
      saasEmpresasService.updateDataFimDesbloqueioManual(payload.empresaId, payload.data_fim_desbloqueio_manual),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saas-contratos'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const isPending = createMutation.isPending || updateMutation.isPending || updateDataFimMutation.isPending;

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
        desconto_percentual: form.desconto_percentual > 0 ? form.desconto_percentual : null,
        desconto_valor: form.desconto_valor > 0 ? form.desconto_valor : null,
        data_validade_desconto: form.data_validade_desconto?.trim() || null,
        isento_mensalidade: form.isento_mensalidade,
        observacoes: form.observacoes || null,
      };
      if (isEditing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
      const novoValor = form.data_fim_desbloqueio_manual?.trim() || null;
      const valorAtual = (dataFimDesbloqueioManual?.trim() || null) ?? null;
      if (novoValor !== valorAtual) {
        await updateDataFimMutation.mutateAsync({ empresaId, data_fim_desbloqueio_manual: novoValor });
      }
    } catch { /* tratado no mutation */ }
  };

  return (
    <>
    <DraggableModal show={show} onClose={onClose} title={isEditing ? `${t('actions.edit')} ${t('nav.contracts')}` : `${t('actions.create')} ${t('nav.contracts')}`} size="md" modalId="saas-contrato-form"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>{t('buttons.cancel')}</Button>
          <Button type="submit" form="saas-contrato-form-id" variant="primary" size="sm" disabled={isPending}>{t('buttons.save')}</Button>
        </div>
      }
    >
      <form id="saas-contrato-form-id" onSubmit={handleSubmit} className="p-3">
        <div className="d-flex flex-column gap-2">
          <EntitySelectField
            label={t('form.plan')}
            required
            value={Number(form.plano_id) || 0}
            onChange={(value) => {
              const planoId: Form['plano_id'] = value ? value : '';
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
            onShowModal={() => setShowPlanoSelectModal(true)}
            entities={planos.map((p) => ({ id: p.id, nome: p.nome }))}
            error={errors.plano_id}
            idFieldTitle={t('form.enterClientId')}
          />
          <div className="d-flex gap-2">
            <div className="flex-fill">
              <FormField name="data_inicio" type="date" label={t('form.startDate')} required size="md" value={form.data_inicio}
                onChange={v => setForm(p => ({ ...p, data_inicio: String(v ?? '') }))} error={errors.data_inicio} />
            </div>
            <div className="flex-fill">
              <FormField name="data_fim" type="date" label={t('form.endDate')} size="md" value={form.data_fim}
                onChange={v => setForm(p => ({ ...p, data_fim: String(v ?? '') }))} />
            </div>
          </div>
          <div className="d-flex gap-2">
            <div className="flex-fill">
              <label htmlFor="dia_vencimento_saas" className="form-label">
                {t('form.dueDay')} <span className="text-danger ms-1">*</span>
              </label>
              <select
                id="dia_vencimento_saas"
                name="dia_vencimento"
                className="form-select"
                value={form.dia_vencimento === '' ? '' : form.dia_vencimento}
                onChange={(e) => setForm(p => ({ ...p, dia_vencimento: e.target.value ? Number(e.target.value) : '' }))}
              >
                <option value="">{t('ui.selectOption')}</option>
                {diasVencimentoList.map((item) => (
                  <option key={item.dia} value={item.dia}>
                    {t('other.day')} {String(item.dia).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-fill">
              <EntitySelectField
                label={t('form.bank')}
                value={Number(form.banco_id) || 0}
                onChange={(value) => {
                  setForm(p => ({ ...p, banco_id: value ? value : '' }));
                  if (errors.banco_id) setErrors(e => ({ ...e, banco_id: undefined }));
                }}
                onShowModal={() => setShowBancoSelectModal(true)}
                entities={bancosAtivos.map((b) => ({ id: b.id, nome: b.nome || b.banco }))}
                error={errors.banco_id}
              />
            </div>
          </div>
          <div className="d-flex gap-2">
            <div className="flex-fill">
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
            <div className="flex-fill">
              <FormField name="valor" type="number" label={t('form.value')} value={form.valor === '' ? '' : form.valor}
                onChange={v => setForm(p => ({ ...p, valor: v !== '' && v != null ? Number(v) : '' }))}
                min={0} step={0.01} size="md" />
            </div>
          </div>
          <div className="d-flex gap-2">
            <div className="flex-fill">
              <FormField name="desconto_percentual" type="number" label={t('form.discountPercent')} placeholder="0.00" size="md"
                value={descontoPercentualDisplay} onChange={handleDescontoPercentualChange} min={0} max={100} step="any" />
            </div>
            <div className="flex-fill">
              <FormField name="desconto_valor" type="number" label={t('form.discountValue')} placeholder={t('placeholder.discountValue')} size="md"
                value={descontoValorDisplay} onChange={handleDescontoValorChange} min={0} step={0.01} />
            </div>
          </div>
          <div className="d-flex gap-2 align-items-end">
            <div className="flex-fill">
              <FormField name="data_validade_desconto" type="date" label={t('form.discountValidity')} size="md"
                value={form.data_validade_desconto} onChange={v => setForm(p => ({ ...p, data_validade_desconto: String(v ?? '') }))} />
            </div>
            <div className="flex-fill">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" role="switch" id="saas_contrato_isento" name="isento_mensalidade"
                  checked={form.isento_mensalidade} onChange={e => setForm(p => ({ ...p, isento_mensalidade: e.target.checked }))} style={{ cursor: 'pointer' }} />
                <label className="form-check-label" htmlFor="saas_contrato_isento" style={{ cursor: 'pointer' }}>{t('form.exemptFromMonthlyFee')}</label>
              </div>
            </div>
          </div>
          <FormField name="observacoes" type="textarea" label={t('form.observations')} value={form.observacoes}
            onChange={v => setForm(p => ({ ...p, observacoes: String(v ?? '') }))} size="md" rows={3} />
          <FormField
            name="data_fim_desbloqueio_manual"
            type="date"
            label={t('saas.dataNaoBloquearAte')}
            value={form.data_fim_desbloqueio_manual}
            onChange={v => setForm(p => ({ ...p, data_fim_desbloqueio_manual: String(v ?? '') }))}
            size="md"
          />
        </div>
      </form>
    </DraggableModal>

    <SaasPlanoListModal
      show={showPlanoSelectModal}
      onClose={() => setShowPlanoSelectModal(false)}
      title={t('ui.selectPlan')}
      onSelectPlano={(plano) => {
        setForm(prev => {
          const next = { ...prev, plano_id: plano.id };
          const valorMensal = Number(plano.valor_mensal) || 0;
          const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
          next.valor = prev.tipo === 'anual' ? valorAnual : valorMensal;
          return next;
        });
        if (errors.plano_id) setErrors(e => ({ ...e, plano_id: undefined }));
        setShowPlanoSelectModal(false);
      }}
    />
    <SaasBancosModal
      show={showBancoSelectModal}
      onClose={() => setShowBancoSelectModal(false)}
      title={t('ui.selectBank')}
      onSelectBanco={(banco) => {
        setForm(p => ({ ...p, banco_id: banco.id }));
        if (errors.banco_id) setErrors(e => ({ ...e, banco_id: undefined }));
        setShowBancoSelectModal(false);
      }}
    />
  </>
  );
};

export default SaasContratoFormModal;
