import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { saasContratoService, saasDiasVencimentoService, type SaasContrato } from 'services/saas/saasCrudService';
import { saasEmpresasService } from 'services/saas/saasEmpresasService';
import { saasPlanoService } from 'services/saas/saasPlanoService';
import { saasBancoService } from 'services/saas/saasConfigService';
import SaasPlanoListModal from './SaasPlanoListModal';
import SaasBancosModal from './SaasBancosModal';
import SaasContratoFormFields, { type SaasContratoFormData } from './SaasContratoFormFields';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
  empresaId: number;
  dataFimDesbloqueioManual?: string | null;
}

const INITIAL: SaasContratoFormData = {
  banco_id: '',
  dia_vencimento: '',
  plano_id: '',
  data_inicio: '',
  data_fim: '',
  tipo: 'mensal',
  valor: '',
  desconto_percentual: 0,
  desconto_valor: 0,
  data_validade_desconto: '',
  isento_mensalidade: false,
  observacoes: '',
  data_fim_desbloqueio_manual: '',
};

const SaasContratoFormModal: React.FC<Props> = ({
  show,
  onClose,
  onSuccess,
  itemId,
  empresaId,
  dataFimDesbloqueioManual,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!itemId;
  const [form, setForm] = useState<SaasContratoFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof SaasContratoFormData, string>>>({});
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

  const planos = useMemo(
    () =>
      (Array.isArray((planosRes as { data?: unknown[] })?.data)
        ? (planosRes as { data: unknown[] }).data
        : []) as { id: number; nome: string; valor_mensal?: number; valor_anual?: number }[],
    [planosRes]
  );

  const bancosAtivos = useMemo(() => {
    const raw = bancosRes?.data as
      | { data?: { id: number; nome?: string; banco: string; ativo?: boolean }[] }
      | undefined;
    const list = raw?.data ?? [];
    return list.filter((b) => b.ativo !== false) as { id: number; nome?: string; banco: string }[];
  }, [bancosRes]);

  const diasVencimentoList = useMemo(() => {
    const diasData = (diasRes as { data?: unknown } | undefined)?.data;
    const list = Array.isArray(diasData)
      ? diasData
      : (((diasData as { data?: unknown[] })?.data ?? []) as {
          id?: number;
          dia?: number;
          dia_padrao?: number;
          ativo?: boolean;
        }[]);
    return list
      .filter((r) => r.ativo === true)
      .map((r) => ({ id: r.id ?? 0, dia: r.dia ?? r.dia_padrao ?? 10 }));
  }, [diasRes]);

  const valorPlanoBase = useMemo(() => {
    if (!form.plano_id) return 0;
    const plano = planos.find((p) => p.id === form.plano_id);
    if (!plano) return 0;
    const valorMensal = Number(plano.valor_mensal) || 0;
    const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
    return form.tipo === 'anual' ? valorAnual : valorMensal;
  }, [form.plano_id, form.tipo, planos]);

  const applyPlanoValor = useCallback(
    (prev: SaasContratoFormData, planoId: SaasContratoFormData['plano_id'], tipo = prev.tipo) => {
      const next: SaasContratoFormData = { ...prev, plano_id: planoId };
      if (planoId && planos.length) {
        const plano = planos.find((p) => p.id === planoId);
        if (plano) {
          const valorMensal = Number(plano.valor_mensal) || 0;
          const valorAnual = plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
          next.valor = tipo === 'anual' ? valorAnual : valorMensal;
        }
      } else {
        next.valor = '';
      }
      return next;
    },
    [planos]
  );

  useEffect(() => {
    if (!show || isEditing || !form.plano_id) return;
    if (form.isento_mensalidade) {
      setForm((p) => ({ ...p, valor: 0 }));
      return;
    }
    const base = valorPlanoBase;
    const descVal = form.desconto_valor || 0;
    const descPct = form.desconto_percentual || 0;
    const desconto = descVal > 0 ? descVal : (base * descPct) / 100;
    const valor = Math.max(0, Math.round((base - desconto) * 100) / 100);
    setForm((p) => (p.valor === '' || Number(p.valor) !== valor ? { ...p, valor } : p));
  }, [
    show,
    isEditing,
    form.plano_id,
    form.tipo,
    form.isento_mensalidade,
    form.desconto_valor,
    form.desconto_percentual,
    valorPlanoBase,
  ]);

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
    customData: data?.data
      ? (() => {
          const d = data.data as SaasContrato;
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
            data_validade_desconto: d.data_validade_desconto
              ? String(d.data_validade_desconto).slice(0, 10)
              : '',
            isento_mensalidade: d.isento_mensalidade ?? false,
            observacoes: d.observacoes ?? '',
            data_fim_desbloqueio_manual: (dataFimDesbloqueioManual ?? '').toString().slice(0, 10),
          } as SaasContratoFormData;
        })()
      : undefined,
  });

  useEffect(() => {
    setDescontoPercentualDisplay(form.desconto_percentual > 0 ? String(form.desconto_percentual) : '');
  }, [form.desconto_percentual]);

  useEffect(() => {
    setDescontoValorDisplay(form.desconto_valor > 0 ? String(form.desconto_valor) : '');
  }, [form.desconto_valor]);

  useEffect(() => {
    if (show && dataFimDesbloqueioManual !== undefined) {
      setForm((p) => ({ ...p, data_fim_desbloqueio_manual: dataFimDesbloqueioManual ?? '' }));
    }
  }, [show, dataFimDesbloqueioManual]);

  const handleDescontoPercentualChange = (v: unknown) => {
    const s = String(v ?? '').trim();
    setDescontoPercentualDisplay(s);
    if (!s) {
      setForm((p) => ({ ...p, desconto_percentual: 0, desconto_valor: 0 }));
      setDescontoValorDisplay('');
      return;
    }
    const pct = Math.round(Number(s) * 100) / 100;
    if (isNaN(pct)) return;
    setForm((prev) => {
      const next = { ...prev, desconto_percentual: pct };
      if (pct > 0 && valorPlanoBase > 0) {
        const val = Math.round(((valorPlanoBase * pct) / 100) * 100) / 100;
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
      setForm((p) => ({ ...p, desconto_valor: 0, desconto_percentual: 0 }));
      setDescontoPercentualDisplay('');
      return;
    }
    const val = Math.round(Number(s) * 100) / 100;
    if (isNaN(val)) return;
    setForm((prev) => {
      const next = { ...prev, desconto_valor: val };
      if (val > 0 && valorPlanoBase > 0) {
        const pct = Math.round(((val / valorPlanoBase) * 100) * 100) / 100;
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
    onSuccess: () => {
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-contratos'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasContrato>) => saasContratoService.update(itemId!, d),
    onSuccess: () => {
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-contratos'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_UPDATE_ERROR),
  });

  const updateDataFimMutation = useMutation({
    mutationFn: (payload: { empresaId: number; data_fim_desbloqueio_manual: string | null }) =>
      saasEmpresasService.updateDataFimDesbloqueioManual(
        payload.empresaId,
        payload.data_fim_desbloqueio_manual
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-contratos'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_UPDATE_ERROR),
  });

  const isPending =
    createMutation.isPending || updateMutation.isPending || updateDataFimMutation.isPending;

  const handleClearError = useCallback((field: keyof SaasContratoFormData) => {
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof SaasContratoFormData, string>> = {};
    if (form.plano_id === '') errs.plano_id = t('form.required');
    if (!form.data_inicio.trim()) errs.data_inicio = t('form.required');
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
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
      const valorAtual = dataFimDesbloqueioManual?.trim() || null;
      if (novoValor !== valorAtual) {
        await updateDataFimMutation.mutateAsync({
          empresaId,
          data_fim_desbloqueio_manual: novoValor,
        });
      }
    } catch {
      // tratado no mutation
    }
  };

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={t('nav.contracts')}
        size="md"
        modalId="saas-contrato-form"
        headerActions={
          <ModalFormActions onCancel={onClose} formId="saas-contrato-form-id" isPending={isPending} />
        }
      >
        <form id="saas-contrato-form-id" onSubmit={handleSubmit} className="form-modal-simple">
          <SaasContratoFormFields
            form={form}
            errors={errors}
            descontoPercentualDisplay={descontoPercentualDisplay}
            descontoValorDisplay={descontoValorDisplay}
            planos={planos}
            bancosAtivos={bancosAtivos}
            diasVencimentoList={diasVencimentoList}
            onPlanoChange={(planoId) => setForm((prev) => applyPlanoValor(prev, planoId))}
            onShowPlanoModal={() => setShowPlanoSelectModal(true)}
            onShowBancoModal={() => setShowBancoSelectModal(true)}
            onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onTipoChange={(tipo) => setForm((prev) => applyPlanoValor(prev, prev.plano_id, tipo))}
            onDescontoPercentualChange={handleDescontoPercentualChange}
            onDescontoValorChange={handleDescontoValorChange}
            onClearError={handleClearError}
          />
        </form>
      </DraggableModal>

      <SaasPlanoListModal
        show={showPlanoSelectModal}
        onClose={() => setShowPlanoSelectModal(false)}
        title={t('ui.selectPlan')}
        onSelectPlano={(plano) => {
          setForm((prev) => {
            const next = applyPlanoValor(prev, plano.id);
            const valorMensal = Number(plano.valor_mensal) || 0;
            const valorAnual =
              plano.valor_anual != null ? Number(plano.valor_anual) : valorMensal * 12;
            next.valor = prev.tipo === 'anual' ? valorAnual : valorMensal;
            return next;
          });
          handleClearError('plano_id');
          setShowPlanoSelectModal(false);
        }}
      />
      <SaasBancosModal
        show={showBancoSelectModal}
        onClose={() => setShowBancoSelectModal(false)}
        title={t('ui.selectBank')}
        onSelectBanco={(banco) => {
          setForm((p) => ({ ...p, banco_id: banco.id }));
          handleClearError('banco_id');
          setShowBancoSelectModal(false);
        }}
      />
    </>
  );
};

export default SaasContratoFormModal;
