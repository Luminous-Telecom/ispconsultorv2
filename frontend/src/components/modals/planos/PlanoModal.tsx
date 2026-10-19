import React, { useMemo, useState, useEffect } from 'react';
import { usePlanoForm } from 'hooks/usePlanoForm';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow from 'components/common/ModalTabsOverflow';
import { Loading, ModalFormActions } from 'components/ui';
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

  const planoTabs = useMemo(
    () => [
      { id: 'informacoes-basicas', label: t('tabs.salePlan') },
      { id: 'servicos-observacoes', label: t('tabs.servicesObservations') },
    ],
    [t]
  );

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
        <Loading variant="centered" message={t('messages.loadingPlanData')} />
      );
    }

    // Conteúdo normal do formulário
    return (
      <form id={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'} onSubmit={formHook.handleSubmit} className="form-modal-simple">
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
                entityId={planoId}
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
              <ModalTabsOverflow
                tabs={planoTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabsClassName={`plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
                isMobile={isMobile}
                id="planoTab"
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

export default PlanoModal;
