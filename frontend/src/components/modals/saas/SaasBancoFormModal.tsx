import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useFormPrefix } from 'hooks/useFormId';
import { useSaasBancoForm } from 'hooks/useSaasBancoForm';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { Button, Spinner } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { InformacoesBasicasTab, ConfiguracoesApiTab } from '../bancos/banco';
import { BancoForm } from '../bancos/banco/types';
import AsaasForm from '../bancos/banco/especificos/AsaasForm';
import EfiForm from '../bancos/banco/especificos/EfiForm';
import { saasBancoService } from 'services/saas/saasConfigService';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; }

const SaasBancoFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEdit = !!itemId;
  const formPrefix = useFormPrefix(isEdit ? 'SaasBancoEditModal' : 'SaasBancoCreateModal');

  const formHook = useSaasBancoForm({ bancoId: itemId ?? null, show, onSuccess });
  const formData = formHook.formData;
  const errors = formHook.errors;
  const isLoading = formHook.isLoadingBanco;

  const [activeTab, setActiveTab] = useState('informacoes-basicas');
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const { success, error, warning } = useNotificationContext();
  const queryClient = useQueryClient();

  const handleCancel = () => {
    setIsGeneratingSecret(false);
    onClose();
  };

  const handleTestConnection = async () => {
    const idToUse = formHook.effectiveBancoId ?? itemId ?? null;
    if (!idToUse) {
      error(t('messages.saveBankBeforeTest'));
      return;
    }
    try {
      const dataToSave: BancoForm = { ...formData };
      if (!dataToSave.api_key?.trim()) delete (dataToSave as Partial<BancoForm>).api_key;
      if (!dataToSave.client_id_producao?.trim()) delete (dataToSave as Partial<BancoForm>).client_id_producao;
      if (!dataToSave.client_secret_producao?.trim()) delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      if (!dataToSave.api_secret?.trim()) delete (dataToSave as Partial<BancoForm>).api_secret;
      delete (dataToSave as Partial<BancoForm>).has_api_key;
      await saasBancoService.update(idToUse, dataToSave);
      queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
      queryClient.invalidateQueries({ queryKey: ['saas-banco', idToUse] });
      const resultado = await saasBancoService.testarConexao(idToUse) as { success?: boolean; data?: unknown; message?: string };
      const ok = resultado?.success ?? true;
      const msg = resultado?.message || (resultado?.data as { message?: string })?.message || t('messages.connectionSuccess');
      if (ok) {
        success(msg);
      } else {
        error(msg);
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const msg = (axiosError?.response?.data as { message?: string } | undefined)?.message || axiosError?.message || t('messages.error');
      error(msg);
    }
  };

  const handleGenerateWebhookSecret = async () => {
    const idToUse = formHook.effectiveBancoId ?? itemId ?? null;
    if (!idToUse) {
      error(t('messages.saveBankBeforeWebhook'));
      return;
    }
    try {
      setIsGeneratingSecret(true);
      const res = await saasBancoService.gerarWebhookSecret(idToUse);
      const data = (res?.data || res) as { webhook_secret?: string };
      if (data?.webhook_secret) {
        formHook.handleInputChange('webhook_secret', data.webhook_secret);
        queryClient.invalidateQueries({ queryKey: ['saas-banco', idToUse] });
        queryClient.invalidateQueries({ queryKey: ['saas-bancos'] });
        success(t('messages.webhookTokenGenerated'));
      } else {
        warning(t('messages.webhookTokenNotReturned'));
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      error((axiosError.response?.data as { message?: string } | undefined)?.message || axiosError.message || t('messages.error'));
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleCopyWebhookSecret = async () => {
    if (!formData.webhook_secret) {
      warning(t('messages.noTokenToCopy'));
      return;
    }
    try {
      await navigator.clipboard.writeText(formData.webhook_secret);
      success(t('messages.webhookTokenCopied'));
    } catch {
      warning(t('messages.copyManual'));
    }
  };

  const renderBancoEspecificoCampos = () => {
    switch (formData.tipo_banco) {
      case 'efi':
        return <EfiForm formData={formData} isPending={formHook.isSubmitting} handleInputChange={formHook.handleInputChange} />;
      case 'asaas':
        return (
          <AsaasForm
            formData={formData}
            isPending={formHook.isSubmitting}
            formPrefix={formPrefix}
            handleInputChange={formHook.handleInputChange}
            onGenerateWebhookSecret={handleGenerateWebhookSecret}
            onCopyWebhookSecret={handleCopyWebhookSecret}
            isGeneratingSecret={isGeneratingSecret}
            isBancoPersisted={formHook.effectiveBancoId != null}
          />
        );
      default:
        return null;
    }
  };

  const modalTitle = isEdit ? t('modal.editBank') : t('modal.createBank');

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title={modalTitle}
      size="xl"
      modalId="saas-banco-form"
      headerActions={
        !(isEdit && isLoading) ? (
          <div className="banco-header-unified">
            <div className="banco-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
              <Button type="button" variant="primary" size="sm" onClick={handleCancel} disabled={formHook.isSubmitting}>{t('buttons.cancel')}</Button>
              <Button type="submit" form="saas-banco-form-id" variant="primary" size="sm" disabled={formHook.isSubmitting}>{t('buttons.save')}</Button>
              {(formHook.effectiveBancoId != null) && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={formHook.isSubmitting}
                >
                  {t('buttons.testConnection')}
                </Button>
              )}
            </div>
            <div className="banco-header-tabs">
              <ul className={`nav nav-tabs banco-tabs-unified ${isMobile ? 'banco-tabs-mobile' : ''}`} role="tablist" style={{ margin: 0, padding: 0, borderBottom: 'none', backgroundColor: 'transparent' }}>
                <li className="nav-item" role="presentation">
                  <button className={`nav-link modal-tab-hover ${activeTab === 'informacoes-basicas' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('informacoes-basicas')}>
                    {t('tabs.basicInfo')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button className={`nav-link modal-tab-hover ${activeTab === 'configuracoes-api' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('configuracoes-api')}>
                    {t('tabs.apiConfig')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : undefined
      }
    >
      {isEdit && isLoading ? (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
          <p className="mt-2">{t('messages.loading')}</p>
        </div>
      ) : (
        <form id="saas-banco-form-id" onSubmit={formHook.handleSubmit}>
          <div className="banco-modal-content">
            <div className="tab-content banco-tab-content banco-tab-content-padded">
              {activeTab === 'informacoes-basicas' && (
                <>
                  <InformacoesBasicasTab
                    formData={formData}
                    errors={errors}
                    handleInputChange={formHook.handleInputChange}
                    isPending={formHook.isSubmitting}
                    formPrefix={formPrefix}
                    renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                  />
                </>
              )}
              {activeTab === 'configuracoes-api' && (
                <ConfiguracoesApiTab
                  formData={formData}
                  errors={errors}
                  handleInputChange={formHook.handleInputChange}
                  isPending={formHook.isSubmitting}
                  formPrefix={formPrefix}
                  renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                />
              )}
            </div>
          </div>
        </form>
      )}
    </DraggableModal>
  );
};

export default SaasBancoFormModal;
