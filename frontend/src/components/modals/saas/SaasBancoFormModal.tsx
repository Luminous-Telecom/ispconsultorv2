import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useFormPrefix } from 'hooks/useFormId';
import { useSaasBancoForm } from 'hooks/useSaasBancoForm';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { Loading, ModalFormActions, TestarConexaoButton } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
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
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const handleCancel = () => {
    onClose();
  };

  const handleTestConnection = async () => {
    const idToUse = formHook.effectiveBancoId ?? itemId ?? null;
    if (!idToUse) {
      showApiError(t('messages.saveBankBeforeTest'));
      return;
    }
    try {
      const dataToSave: BancoForm = { ...formData };
      if (!dataToSave.api_key?.trim()) delete (dataToSave as Partial<BancoForm>).api_key;
      if (!dataToSave.client_id_producao?.trim()) delete (dataToSave as Partial<BancoForm>).client_id_producao;
      if (!dataToSave.client_secret_producao?.trim()) delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      if (!dataToSave.api_secret?.trim()) delete (dataToSave as Partial<BancoForm>).api_secret;
      if (!dataToSave.webhook_secret?.trim()) delete (dataToSave as Partial<BancoForm>).webhook_secret;
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
        showApiError(msg);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BANCO_TEST_ERROR);
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
            handleInputChange={formHook.handleInputChange}
          />
        );
      default:
        return null;
    }
  };

  const modalTitle = isEdit ? t('modal.editBank') : t('modal.createBank');

  const bancoTabs = useMemo((): ModalTabItem[] => [
    { id: 'informacoes-basicas', label: t('tabs.basicInfo') },
    { id: 'configuracoes-api', label: t('tabs.apiConfig') },
  ], [t]);

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
              <ModalFormActions
                className="d-flex gap-2"
                onCancel={handleCancel}
                formId="saas-banco-form-id"
                isPending={formHook.isSubmitting}
              />
              {(formHook.effectiveBancoId != null) && (
                <TestarConexaoButton
                  type="button"
                  onClick={handleTestConnection}
                  isPending={formHook.isSubmitting}
                />
              )}
            </div>
            <div className="banco-header-tabs">
              <ModalTabsOverflow
                tabs={bancoTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabsClassName={`banco-tabs-unified ${isMobile ? 'banco-tabs-mobile' : ''}`}
                isMobile={isMobile}
                id="saas-banco-tabs"
              />
            </div>
          </div>
        ) : undefined
      }
    >
      {isEdit && isLoading ? (
        <Loading variant="centered" message={t('messages.loading')} />
      ) : (
        <div className="banco-modal-content">
          <form id="saas-banco-form-id" onSubmit={formHook.handleSubmit} className="form-modal-simple">
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
          </form>
        </div>
      )}
    </DraggableModal>
  );
};

export default SaasBancoFormModal;
