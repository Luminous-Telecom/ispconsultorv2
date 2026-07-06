import React, { useState, useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { ParametrosService } from 'services/parametrosService';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions, FormField, AtivoInativoField, Loading } from 'components/ui';

interface ParametrosModalProps {
  show: boolean;
  onClose: () => void;
}

interface ParametrosForm {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login: string;
}

const ParametrosModal: React.FC<ParametrosModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const initialFormData: ParametrosForm = {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
    central_assinante_metodo_login: 'cnpj'
  };

  const [formData, setFormData] = useState<ParametrosForm>(initialFormData);

  const { data: parametros, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const customFormData = useMemo(() => {
    if (!parametros?.data) return undefined;
    
    return {
      validar_cpf_cnpj: parametros.data.validar_cpf_cnpj ?? true,
      validar_cep: parametros.data.validar_cep ?? false,
      titulos_vence_sabado: parametros.data.titulos_vence_sabado ?? false,
      titulos_vence_domingo: parametros.data.titulos_vence_domingo ?? false,
      central_assinante_metodo_login: parametros.data.central_assinante_metodo_login ?? 'cnpj'
    };
  }, [parametros?.data]);

  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    customData: customFormData
  });

  const updateParametrosMutation = useMutation({
    mutationFn: (data: ParametrosForm) => ParametrosService.update(data),
    onSuccess: () => {
      success(t('params.successUpdate'));
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PARAMS_UPDATE_ERROR),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParametrosMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (customFormData) {
      setFormData(customFormData);
    }
    onClose();
  };

  const isPending = updateParametrosMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('layout.parameters')}
      size="md"
      modalId="parametros-modal"
      headerActions={
        <ModalFormActions
          onCancel={handleCancel}
          formId="parametros-form"
          isPending={isPending}
        />
      }
    >
      {isLoading ? (
        <Loading variant="centered" message={t('ui.loading')} />
      ) : (
      <form id="parametros-form" onSubmit={handleSubmit} className="form-modal-simple modal-inner-padding">
        <div className="form-section-heading-row">
          <span className="form-section-heading-pill">{t('params.validations')}</span>
          <div className="form-section-heading-line" aria-hidden />
        </div>
        <div className="row g-2">
          <div className="col-12">
            <AtivoInativoField
              name="validar_cpf_cnpj"
              label={t('params.validateCpfCnpj')}
              value={formData.validar_cpf_cnpj}
              onChange={(v) => setFormData(prev => ({ ...prev, validar_cpf_cnpj: v }))}
              disabled={isPending}
            />
          </div>
          <div className="col-12">
            <AtivoInativoField
              name="validar_cep"
              label={t('params.validateCep')}
              value={formData.validar_cep}
              onChange={(v) => setFormData(prev => ({ ...prev, validar_cep: v }))}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="form-section-heading-row mt-2">
          <span className="form-section-heading-pill">{t('params.titleGeneration')}</span>
          <div className="form-section-heading-line" aria-hidden />
        </div>
        <div className="row g-2">
          <div className="col-12">
            <AtivoInativoField
              name="titulos_vence_sabado"
              label={t('params.titlesDueSaturday')}
              value={formData.titulos_vence_sabado}
              onChange={(v) => setFormData(prev => ({ ...prev, titulos_vence_sabado: v }))}
              disabled={isPending}
            />
          </div>
          <div className="col-12">
            <AtivoInativoField
              name="titulos_vence_domingo"
              label={t('params.titlesDueSunday')}
              value={formData.titulos_vence_domingo}
              onChange={(v) => setFormData(prev => ({ ...prev, titulos_vence_domingo: v }))}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="form-section-heading-row mt-2">
          <span className="form-section-heading-pill">{t('params.subscriberCenter')}</span>
          <div className="form-section-heading-line" aria-hidden />
        </div>
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="central_assinante_metodo_login"
              type="select"
              label={t('params.loginMethod')}
              helpText={t('params.loginMethodHelp')}
              value={formData.central_assinante_metodo_login}
              onChange={(v) => setFormData(prev => ({ ...prev, central_assinante_metodo_login: String(v ?? 'cnpj') }))}
              disabled={isPending}
              options={[
                { value: 'cnpj', label: 'CNPJ' },
                { value: 'email', label: 'Email' },
              ]}
              size="sm"
            />
          </div>
        </div>
      </form>
      )}
    </DraggableModal>
  );
};

export default ParametrosModal;
