import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { AtivoInativoField, FormField, Loading, ModalFormActions } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import type { SaasParametros } from 'services/saas/saasParametrosService';
import {
  RECURSOS_SISTEMA_BY_VARIANT,
  RECURSOS_ERP_INITIAL,
  RECURSOS_SAAS_INITIAL,
  mapSaasParametrosToForm,
  type RecursosSistemaVariant,
  type RecursosSistemaFormBase,
  type RecursosSistemaFormSaas,
} from './recursosSistemaVariants';

export interface RecursosSistemaModalCoreProps {
  variant: RecursosSistemaVariant;
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const RecursosSistemaModalCore: React.FC<RecursosSistemaModalCoreProps> = ({
  variant,
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const isSaas = variant === 'saas';
  const config = RECURSOS_SISTEMA_BY_VARIANT[variant];
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<RecursosSistemaFormSaas>(
    isSaas ? RECURSOS_SAAS_INITIAL : { ...RECURSOS_SAAS_INITIAL }
  );

  const { data: parametros, isLoading } = useQuery({
    queryKey: [...config.queryKey],
    queryFn: () => config.api.get(),
    enabled: show,
    staleTime: 60 * 1000,
    refetchOnMount: !isSaas,
  });

  const customFormData = useMemo((): RecursosSistemaFormSaas | undefined => {
    if (!parametros?.data) return undefined;
    const d = parametros.data;
    const base: RecursosSistemaFormBase = {
      validar_cpf_cnpj: d.validar_cpf_cnpj ?? true,
      validar_cep: d.validar_cep ?? false,
      titulos_vence_sabado: d.titulos_vence_sabado ?? false,
      titulos_vence_domingo: d.titulos_vence_domingo ?? false,
      central_assinante_metodo_login: d.central_assinante_metodo_login ?? 'cnpj',
      dias_suspender_atraso:
        'dias_suspender_atraso' in d ? ((d as RecursosSistemaFormBase).dias_suspender_atraso ?? null) : null,
    };
    if (!isSaas) return { ...RECURSOS_SAAS_INITIAL, ...base };
    return mapSaasParametrosToForm(d as SaasParametros, base);
  }, [parametros?.data, isSaas]);

  useFormReset({
    show,
    initialData: isSaas ? RECURSOS_SAAS_INITIAL : { ...RECURSOS_SAAS_INITIAL, ...RECURSOS_ERP_INITIAL },
    setFormData,
    customData: customFormData,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<RecursosSistemaFormSaas>) => config.api.update(data),
    onSuccess: () => {
      success(t('params.successUpdate'));
      queryClient.invalidateQueries({ queryKey: [...config.queryKey] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PARAMS_UPDATE_ERROR),
  });

  const idPrefix = isSaas ? 'saas_' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaas) {
      const payload = { ...formData };
      if (!payload.manter_numeros_titulos) payload.quantidade_titulos_manter = 12;
      if (payload.dias_atraso_bloqueio !== null && payload.dias_atraso_bloqueio <= 0) {
        payload.dias_atraso_bloqueio = null;
      }
      if (payload.dias_desbloqueio_manual !== null && payload.dias_desbloqueio_manual <= 0) {
        payload.dias_desbloqueio_manual = null;
      }
      const { dias_suspender_atraso: _s, ...saasPayload } = payload;
      updateMutation.mutate(saasPayload);
      return;
    }
    const {
      manter_numeros_titulos: _m,
      quantidade_titulos_manter: _q,
      dias_atraso_bloqueio: _a,
      dias_desbloqueio_manual: _d,
      ...erpPayload
    } = formData;
    if (erpPayload.dias_suspender_atraso !== null && erpPayload.dias_suspender_atraso <= 0) {
      erpPayload.dias_suspender_atraso = null;
    }
    updateMutation.mutate(erpPayload);
  };

  const handleSelectChange = (field: keyof RecursosSistemaFormBase, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const headerActionsContent = useMemo(
    () => (
      <ModalFormActions
        onCancel={onClose}
        formId={config.formId}
        isPending={updateMutation.isPending}
      />
    ),
    [onClose, config.formId, updateMutation.isPending]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <>
      {isLoading ? (
        <Loading variant="modal" />
      ) : (
        <form
          id={config.formId}
          className={`form-modal-simple modal-inner-padding-recursos${isSaas ? ' is-saas' : ''}`}
          onSubmit={handleSubmit}
        >
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('params.validations')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <AtivoInativoField
                value={formData.validar_cpf_cnpj}
                onChange={(v) => setFormData((prev) => ({ ...prev, validar_cpf_cnpj: v }))}
                label={t('params.validateCpfCnpj')}
                helpText={t(isSaas ? 'params.validateCpfCnpjHelpSaas' : 'params.validateCpfCnpjHelp')}
                name={`${idPrefix}validar_cpf_cnpj`}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="col-12">
              <AtivoInativoField
                value={formData.validar_cep}
                onChange={(v) => setFormData((prev) => ({ ...prev, validar_cep: v }))}
                label={t('params.validateCep')}
                helpText={t(isSaas ? 'params.validateCepHelpSaas' : 'params.validateCepHelp')}
                name={`${idPrefix}validar_cep`}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('params.titleGeneration')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <AtivoInativoField
                value={formData.titulos_vence_sabado}
                onChange={(v) => setFormData((prev) => ({ ...prev, titulos_vence_sabado: v }))}
                label={t('params.titlesDueSaturday')}
                helpText={t('params.titlesDueSaturdayHelp')}
                name={`${idPrefix}titulos_vence_sabado`}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="col-12">
              <AtivoInativoField
                value={formData.titulos_vence_domingo}
                onChange={(v) => setFormData((prev) => ({ ...prev, titulos_vence_domingo: v }))}
                label={t('params.titlesDueSunday')}
                helpText={t('params.titlesDueSundayHelp')}
                name={`${idPrefix}titulos_vence_domingo`}
                disabled={updateMutation.isPending}
              />
            </div>
            {isSaas && (
              <>
                <div className="col-12">
                  <AtivoInativoField
                    value={formData.manter_numeros_titulos}
                    onChange={(v) => setFormData((prev) => ({ ...prev, manter_numeros_titulos: v }))}
                    label={t('params.keepTitleNumbers')}
                    helpText={t('params.keepTitleNumbersHelp')}
                    name="saas_manter_numeros_titulos"
                    disabled={updateMutation.isPending}
                  />
                </div>
                {formData.manter_numeros_titulos && (
                  <div className="col-12">
                    <FormField
                      name="saas_quantidade_titulos_manter"
                      type="number"
                      label={t('params.keepTitleQuantity')}
                      value={formData.quantidade_titulos_manter}
                      onChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantidade_titulos_manter: Math.min(24, Math.max(1, Number(v) || 1)),
                        }))
                      }
                      min={1}
                      max={24}
                      size="sm"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('params.subscriberCenter')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
          <div className="row g-2 mb-3">
            <div className="col-12">
              <FormField
                name={`${idPrefix}central_metodo`}
                type="select"
                label={t('params.loginMethod')}
                helpText={t('params.loginMethodHelp')}
                value={formData.central_assinante_metodo_login}
                onChange={(v) => handleSelectChange('central_assinante_metodo_login', String(v ?? 'cnpj'))}
                options={[
                  { value: 'cnpj', label: 'CNPJ' },
                  { value: 'email', label: 'Email' },
                ]}
                size="sm"
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          {!isSaas && (
            <>
              <div className="form-section-heading-row">
                <span className="form-section-heading-pill">{t('params.overdueSuspendSection')}</span>
                <div className="form-section-heading-line" aria-hidden />
              </div>
              <div className="row g-2 mb-3">
                <div className="col-12">
                  <FormField
                    name="dias_suspender_atraso"
                    type="number"
                    label={t('params.overdueDaysSuspend')}
                    helpText={t('params.overdueDaysSuspendHelp')}
                    placeholder={t('params.exampleDays15')}
                    value={formData.dias_suspender_atraso ?? ''}
                    onChange={(v) => {
                      const raw = String(v ?? '');
                      setFormData((prev) => ({
                        ...prev,
                        dias_suspender_atraso:
                          raw === '' ? null : Math.min(365, Math.max(0, parseInt(raw, 10) || 0)),
                      }));
                    }}
                    min={0}
                    max={365}
                    size="sm"
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            </>
          )}

          {isSaas && (
            <>
              <div className="form-section-heading-row">
                <span className="form-section-heading-pill">{t('params.overdueBlockSection')}</span>
                <div className="form-section-heading-line" aria-hidden />
              </div>
              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="saas_dias_atraso_bloqueio"
                    type="number"
                    label={t('params.overdueDaysBlock')}
                    helpText={t('params.overdueDaysBlockHelp')}
                    placeholder={t('params.exampleDays15')}
                    value={formData.dias_atraso_bloqueio ?? ''}
                    onChange={(v) => {
                      const raw = String(v ?? '');
                      setFormData((prev) => ({
                        ...prev,
                        dias_atraso_bloqueio:
                          raw === '' ? null : Math.min(365, Math.max(0, parseInt(raw, 10) || 0)),
                      }));
                    }}
                    min={0}
                    max={365}
                    size="sm"
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="col-12">
                  <FormField
                    name="saas_dias_desbloqueio_manual"
                    type="number"
                    label={t('params.manualUnlockDays')}
                    helpText={t('params.manualUnlockDaysHelp')}
                    placeholder={t('params.exampleDays7')}
                    value={formData.dias_desbloqueio_manual ?? ''}
                    onChange={(v) => {
                      const raw = String(v ?? '');
                      setFormData((prev) => ({
                        ...prev,
                        dias_desbloqueio_manual:
                          raw === '' ? null : Math.min(365, Math.max(0, parseInt(raw, 10) || 0)),
                      }));
                    }}
                    min={0}
                    max={365}
                    size="sm"
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            </>
          )}
        </form>
      )}
    </>
  );

  if (skipWrapper) return modalContent;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('params.systemResources')}
      size="md"
      modalId={config.modalId}
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default RecursosSistemaModalCore;
