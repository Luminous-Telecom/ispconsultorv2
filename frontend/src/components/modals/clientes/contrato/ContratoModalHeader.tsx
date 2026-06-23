import React, { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { ImprimirButton, ModalFormActions } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';

interface ContratoModalHeaderProps {
  isEditMode: boolean;
  isMobile: boolean;
  activeTab: string;
  isSubmitting: boolean;
  formId?: string;
  onClose: () => void;
  onPrintContract: () => void;
  onTabChange: (tab: string) => void;
}

function ContratoModalHeader({
  isEditMode,
  isMobile,
  activeTab,
  isSubmitting,
  formId = 'contrato-form',
  onClose,
  onPrintContract,
  onTabChange,
}: ContratoModalHeaderProps) {
  const { t } = useI18n();

  const tabs = useMemo(
    (): ModalTabItem[] => [
      { id: 'contrato', label: t('tabs.contractData') },
      { id: 'endereco', label: t('tabs.address') },
      { id: 'termos', label: t('tabs.terms'), disabled: !isEditMode },
      { id: 'financeiro', label: t('tabs.financial'), disabled: !isEditMode },
      { id: 'financeiro-avulso', label: t('tabs.financialMisc'), disabled: !isEditMode },
      { id: 'servicos-adicionais', label: t('tabs.additionalServices'), disabled: !isEditMode },
      { id: 'ixc-provedor', label: t('tabs.ixcProvedor'), disabled: !isEditMode },
    ],
    [isEditMode, t]
  );

  const handleTabChange = (tab: string) => {
    const requiresEdit = tab !== 'contrato' && tab !== 'endereco';
    if (requiresEdit && !isEditMode) return;
    onTabChange(tab);
  };

  return (
    <div className="contrato-header-unified">
      <div className="contrato-header-buttons modal-header-actions d-flex gap-2 flex-wrap">
        {isEditMode && (
          <ImprimirButton
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPrintContract();
            }}
          />
        )}
        <ModalFormActions
          className="d-flex gap-2"
          onCancel={onClose}
          formId={formId}
          isPending={isSubmitting}
        />
      </div>
      <div className="contrato-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsClassName={`contrato-tabs-unified ${isMobile ? 'contrato-tabs-mobile' : ''}`}
          disabledClassName="contrato-tab-disabled"
          isMobile={isMobile}
          id="contratoTab"
        />
      </div>
    </div>
  );
}

export default ContratoModalHeader;
