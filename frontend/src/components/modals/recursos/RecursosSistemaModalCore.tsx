import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { LabelWithHelp, Loading, ModalFormActions } from 'components/ui';
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
  const isMobile = useIsMobile();
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
      success('Parâmetros atualizados com sucesso!');
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
      updateMutation.mutate(payload);
      return;
    }
    const { manter_numeros_titulos: _m, quantidade_titulos_manter: _q, dias_atraso_bloqueio: _a, dias_desbloqueio_manual: _d, ...erpPayload } =
      formData;
    updateMutation.mutate(erpPayload);
  };

  const handleCheckboxChange = (field: keyof RecursosSistemaFormSaas) => {
    setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
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
          className="form-modal-simple"
          onSubmit={handleSubmit}
          style={{ padding: isMobile ? '0' : '16px', paddingBottom: isMobile ? 0 : isSaas ? 24 : 16 }}
        >
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">{t('params.validations')}</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}validar_cpf_cnpj`}
                  checked={formData.validar_cpf_cnpj}
                  onChange={() => handleCheckboxChange('validar_cpf_cnpj')}
                  disabled={updateMutation.isPending}
                />
                <LabelWithHelp
                  htmlFor={`${idPrefix}validar_cpf_cnpj`}
                  className="form-check-label"
                  helpText={t(isSaas ? 'params.validateCpfCnpjHelpSaas' : 'params.validateCpfCnpjHelp')}
                >
                  {t('params.validateCpfCnpj')}
                </LabelWithHelp>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}validar_cep`}
                  checked={formData.validar_cep}
                  onChange={() => handleCheckboxChange('validar_cep')}
                  disabled={updateMutation.isPending}
                />
                <LabelWithHelp
                  htmlFor={`${idPrefix}validar_cep`}
                  className="form-check-label"
                  helpText={t(isSaas ? 'params.validateCepHelpSaas' : 'params.validateCepHelp')}
                >
                  {t('params.validateCep')}
                </LabelWithHelp>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">{t('params.titleGeneration')}</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}titulos_vence_sabado`}
                  checked={formData.titulos_vence_sabado}
                  onChange={() => handleCheckboxChange('titulos_vence_sabado')}
                  disabled={updateMutation.isPending}
                />
                <LabelWithHelp
                  htmlFor={`${idPrefix}titulos_vence_sabado`}
                  className="form-check-label"
                  helpText={t('params.titlesDueSaturdayHelp')}
                >
                  {t('params.titlesDueSaturday')}
                </LabelWithHelp>
              </div>
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${idPrefix}titulos_vence_domingo`}
                  checked={formData.titulos_vence_domingo}
                  onChange={() => handleCheckboxChange('titulos_vence_domingo')}
                  disabled={updateMutation.isPending}
                />
                <LabelWithHelp
                  htmlFor={`${idPrefix}titulos_vence_domingo`}
                  className="form-check-label"
                  helpText={t('params.titlesDueSundayHelp')}
                >
                  {t('params.titlesDueSunday')}
                </LabelWithHelp>
              </div>
              {isSaas && (
                <>
                  <div className="form-check mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="saas_manter_numeros_titulos"
                      checked={formData.manter_numeros_titulos}
                      onChange={() => handleCheckboxChange('manter_numeros_titulos')}
                      disabled={updateMutation.isPending}
                    />
                    <LabelWithHelp
                      htmlFor="saas_manter_numeros_titulos"
                      className="form-check-label"
                      helpText={t('params.keepTitleNumbersHelp')}
                    >
                      {t('params.keepTitleNumbers')}
                    </LabelWithHelp>
                  </div>
                  {formData.manter_numeros_titulos && (
                    <div className="mb-3">
                      <label htmlFor="saas_quantidade_titulos_manter" className="form-label small mb-1">
                        Quantidade de Títulos a Manter (1 a 24)
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        id="saas_quantidade_titulos_manter"
                        min={1}
                        max={24}
                        value={formData.quantidade_titulos_manter}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantidade_titulos_manter: Math.min(
                              24,
                              Math.max(1, parseInt(e.target.value, 10) || 12)
                            ),
                          }))
                        }
                        disabled={updateMutation.isPending}
                        style={{ maxWidth: '80px' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">{t('params.subscriberCenter')}</small>
            </div>
            <div className={`card-body p-2${isSaas ? ' overflow-visible' : ''}`}>
              <LabelWithHelp
                htmlFor={`${idPrefix}central_metodo`}
                className="form-label small mb-1"
                helpText={t('params.loginMethodHelp')}
              >
                {t('params.loginMethod')}
              </LabelWithHelp>
              <select
                className={`form-select form-select-sm`}
                id={`${idPrefix}central_metodo`}
                value={formData.central_assinante_metodo_login}
                onChange={(e) => handleSelectChange('central_assinante_metodo_login', e.target.value)}
                disabled={updateMutation.isPending}
              >
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {isSaas && (
            <div className="card mb-3">
              <div className="card-header py-1 px-2">
                <small className="fw-bold mb-0">{t('params.overdueBlockSection')}</small>
              </div>
              <div className="card-body p-2 overflow-visible">
                <div className="mb-3">
                  <LabelWithHelp
                    htmlFor="saas_dias_atraso_bloqueio"
                    className="form-label small mb-1"
                    helpText={t('params.overdueDaysBlockHelp')}
                  >
                    {t('params.overdueDaysBlock')}
                  </LabelWithHelp>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    id="saas_dias_atraso_bloqueio"
                    min={0}
                    max={365}
                    placeholder="Ex: 15"
                    value={formData.dias_atraso_bloqueio ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        dias_atraso_bloqueio:
                          v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0)),
                      }));
                    }}
                    disabled={updateMutation.isPending}
                    style={{ maxWidth: '140px', minWidth: '80px' }}
                  />
                  <small className="text-muted form-hint d-block mt-1">{t('params.overdueDaysBlockDisabledHint')}</small>
                </div>
                <div className="mb-3">
                  <LabelWithHelp
                    htmlFor="saas_dias_desbloqueio_manual"
                    className="form-label small mb-1"
                    helpText={t('params.manualUnlockDaysHelp')}
                  >
                    {t('params.manualUnlockDays')}
                  </LabelWithHelp>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    id="saas_dias_desbloqueio_manual"
                    min={0}
                    max={365}
                    placeholder="Ex: 7"
                    value={formData.dias_desbloqueio_manual ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        dias_desbloqueio_manual:
                          v === '' ? null : Math.min(365, Math.max(0, parseInt(v, 10) || 0)),
                      }));
                    }}
                    disabled={updateMutation.isPending}
                    style={{ maxWidth: '140px', minWidth: '80px' }}
                  />
                  <small className="text-muted form-hint d-block mt-1">{t('params.overdueDaysBlockDisabledHint')}</small>
                </div>
              </div>
            </div>
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
      title={config.title}
      size="md"
      modalId={config.modalId}
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default RecursosSistemaModalCore;
