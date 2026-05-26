import React, { useState, useEffect } from 'react';
import { usePlanoForm } from 'hooks/usePlanoForm';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions, Spinner } from 'components/ui';
import { InformacoesBasicasTab, ServicosObservacoesTab } from './plano';

interface PlanoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null; // Se passar planoId, é edição; se não, é criação
}

const PlanoModal: React.FC<PlanoModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  planoId 
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('informacoes-basicas');

  // Hook de formulário com React Hook Form + Zod
  const formHook = usePlanoForm({
    planoId: planoId || null,
    show,
    onSuccess
  });

  // Resetar aba ativa quando modal abrir
  useEffect(() => {
    if (show) {
      setActiveTab('informacoes-basicas');
    }
  }, [show]);

  // Determinar título dinamicamente
  const modalTitle = formHook.isEditing ? t('modal.editPlan') : t('modal.createPlan');

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (formHook.isLoadingPlano && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
          <p className="mt-2">{t('messages.loadingPlanData')}</p>
        </div>
      );
    }

    // Conteúdo normal do formulário
    return (
      <form id={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'} onSubmit={formHook.handleSubmit}>
        <div className="plano-modal-content">
          {/* Conteúdo das Abas */}
          <div
            className={`tab-content plano-tab-content plano-tab-content-padded`}
            id="planoTabContent"
          >
            {/* Aba Plano de Venda */}
            {activeTab === 'informacoes-basicas' && (
              <InformacoesBasicasTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                handleServiceToggle={formHook.handleServiceToggle}
                servicosDisponiveis={[]}
                isSubmitting={formHook.isSubmitting}
              />
            )}

            {/* Aba Observações */}
            {activeTab === 'servicos-observacoes' && (
              <ServicosObservacoesTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                handleServiceToggle={formHook.handleServiceToggle}
                servicosDisponiveis={[]}
                isSubmitting={formHook.isSubmitting}
              />
            )}
          </div>
        </div>
      </form>
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      modalId={formHook.isEditing ? 'plano-edit-modal' : 'plano-create-modal'}
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando
        !(formHook.isLoadingPlano && formHook.isEditing) ? (
          <div className="plano-header-unified">
            {/* Botões à direita */}
            <ModalFormActions
              className="plano-header-buttons modal-header-actions d-flex gap-2"
              onCancel={onClose}
              formId={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'}
              isPending={formHook.isSubmitting}
            />

            {/* Abas na parte inferior do header */}
            <div className="plano-header-tabs">
              <ul
                className={`nav nav-tabs plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
                id="planoTab"
                role="tablist"
                style={{
                  margin: 0,
                  padding: 0,
                  borderBottom: 'none',
                  backgroundColor: 'transparent'
                }}
              >
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'informacoes-basicas' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('informacoes-basicas')}
                  >
                    {t('tabs.salePlan')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link modal-tab-hover ${activeTab === 'servicos-observacoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('servicos-observacoes')}
                  >
                    {t('tabs.servicesObservations')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default PlanoModal;
