import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { BancoService } from 'services/bancoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormPrefix } from 'hooks/useFormId';
import { useBancoForm } from 'hooks/useBancoForm';
import { useIsMobile } from 'hooks/useMediaQuery';
import { Banco } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow from 'components/common/ModalTabsOverflow';
import { Loading, ModalFormActions, TestarConexaoButton } from 'components/ui';
import { InformacoesBasicasTab, ConfiguracoesApiTab } from './banco';
import { BancoForm } from './banco/types';
import AsaasForm from './banco/especificos/AsaasForm';
import EfiForm from './banco/especificos/EfiForm';
import { withInvalidTabs } from 'utils/tabValidation';

interface BancoModalProps {
  show: boolean;
  onClose: () => void;
  bancoId?: number | null;
  onSuccess?: (banco: Banco) => void;
}

const BancoModal: React.FC<BancoModalProps> = ({ 
  show, 
  onClose, 
  bancoId,
  onSuccess 
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEdit = !!bancoId;
  const formPrefix = useFormPrefix(isEdit ? 'BancoEditModal' : 'BancoCreateModal');
  
  // Hook de formulário com React Hook Form + Zod
  const formHook = useBancoForm({
    bancoId: bancoId || null,
    show,
    onSuccess
  });

  // Usar dados do hook
  const formData = formHook.formData;
  const errors = formHook.errors;
  const isLoading = formHook.isLoadingBanco;

  // Estados locais para funcionalidades específicas do modal
  const [activeTab, setActiveTab] = useState('informacoes-basicas');

  const bancoTabs = useMemo(
    () => withInvalidTabs([
      { id: 'informacoes-basicas', label: t('tabs.basicInfo') },
      { id: 'configuracoes-api', label: t('tabs.apiConfig') },
    ], errors, {
      'informacoes-basicas': ['nome', 'codigo', 'descricao', 'ativo', 'tipo_banco', 'servidor_email_cobranca_id', 'servidor_whatsapp_cobranca_id'],
      'configuracoes-api': [
        'api_url', 'api_key', 'api_secret', 'webhook_secret', 'identificador_conta',
        'client_id_producao', 'client_secret_producao', 'url_retorno', 'percentual_multa',
        'percentual_juros', 'desconto_tipo', 'desconto_valor', 'maximo_dias_recalcular',
        'layout_web', 'layout_pdf', 'local_pagamento', 'dados_avalista', 'taxa_cobranca',
      ],
    }),
    [errors, t]
  );
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const handleCancel = () => {
    onClose();
  };

  const handleTestConnection = async () => {
    const idToUse = formHook.effectiveBancoId ?? bancoId ?? null;
    if (!idToUse) {
      showApiError(t('messages.saveBankBeforeTest'));
      return;
    }

    try {
      // Preparar dados para salvar
      const dataToSave: BancoForm = { ...formData };
      
      // Se api_key estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.api_key || dataToSave.api_key.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_key;
      }
      
      // Se client_id_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_id_producao || dataToSave.client_id_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_id_producao;
      }
      
      // Se client_secret_producao estiver vazio, não enviar (para não sobrescrever o valor existente)
      if (!dataToSave.client_secret_producao || dataToSave.client_secret_producao.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).client_secret_producao;
      }
      
      if (!dataToSave.api_secret || dataToSave.api_secret.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).api_secret;
      }
      if (!dataToSave.webhook_secret || dataToSave.webhook_secret.trim() === '') {
        delete (dataToSave as Partial<BancoForm>).webhook_secret;
      }
      delete (dataToSave as Partial<BancoForm>).has_api_key;
      
      // Salvar dados primeiro (sem fechar o modal)
      await BancoService.update(idToUse, dataToSave);
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['banco', idToUse] });
      
      // Testar conexão
      const resultado = await BancoService.testarConexao(idToUse);
      
      if (resultado.success) {
        success(resultado.message || t('messages.connectionSuccess'));
      } else {
        let mensagemErro = resultado.message || t('messages.connectionFailed');
        
        // Melhorar mensagem se for erro de credenciais
        if (mensagemErro.includes('Credenciais do banco não configuradas')) {
          mensagemErro = formData.tipo_banco === 'asaas'
            ? t('messages.credentialsNotConfiguredAsaas')
            : t('messages.credentialsNotConfiguredEfi');
        }
        
        showApiError(mensagemErro);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BANCO_TEST_ERROR);
    }
  };

  const renderBancoEspecificoCampos = () => {
    switch (formData.tipo_banco) {
      case 'efi':
        return (
          <EfiForm
            formData={formData}
            isPending={formHook.isSubmitting}
            handleInputChange={formHook.handleInputChange}
          />
        );
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

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (isEdit && isLoading) {
      return (
        <Loading variant="centered" message={t('messages.loading')} />
      );
    }

    // Conteúdo normal do formulário
    return (
      <form id="banco-form" onSubmit={formHook.handleSubmit} className="form-modal-simple">
        <div className="banco-modal-content">
          {/* Conteúdo das Abas */}
          <div
            className={`tab-content banco-tab-content banco-tab-content-padded`}
            id="bancoTabContent"
          >
            {/* Aba Banco */}
            {activeTab === 'informacoes-basicas' && (
              <InformacoesBasicasTab
                formData={formData}
                errors={errors}
                handleInputChange={formHook.handleInputChange}
                isPending={formHook.isSubmitting}
                formPrefix={formPrefix}
                renderBancoEspecificoCampos={renderBancoEspecificoCampos}
                entityId={bancoId}
              />
            )}

            {/* Aba Configurações da API */}
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
    );
  };

  const modalTitle = isEdit ? t('modal.editBank') : t('modal.createBank');

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title={modalTitle}
      size="xl"
      modalId="banco-modal"
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando
        !(isEdit && isLoading) ? (
          <div className="banco-header-unified">
            {/* Botões à direita */}
            <div className="banco-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
              <ModalFormActions
                className="d-flex gap-2"
                onCancel={handleCancel}
                formId="banco-form"
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

            {/* Abas na parte inferior do header */}
            <div className="banco-header-tabs">
              <ModalTabsOverflow
                tabs={bancoTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabsClassName={`banco-tabs-unified ${isMobile ? 'banco-tabs-mobile' : ''}`}
                isMobile={isMobile}
                id="bancoTab"
              />
            </div>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default BancoModal;

