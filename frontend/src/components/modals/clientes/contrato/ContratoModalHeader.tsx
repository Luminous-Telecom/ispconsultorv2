import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { ImprimirButton, ModalFormActions } from 'components/ui';

interface ContratoModalHeaderProps {
  isEditMode: boolean;
  isMobile: boolean;
  activeTab: string;
  isSubmitting: boolean;
  onClose: () => void;
  onPrintContract: () => void;
  onTabChange: (tab: string) => void;
}

function ContratoModalHeader({
  isEditMode,
  isMobile,
  activeTab,
  isSubmitting,
  onClose,
  onPrintContract,
  onTabChange,
}: ContratoModalHeaderProps) {
  const { t } = useI18n();

  const handleTabClick = (tab: string, requiresEdit = false) => {
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
          formId="contrato-form"
          isPending={isSubmitting}
        />
      </div>
      <div className="contrato-header-tabs">
        <ul
          className={`nav nav-tabs contrato-tabs-unified ${isMobile ? 'contrato-tabs-mobile' : ''}`}
          id="contratoTab"
          role="tablist"
          style={{
            margin: 0,
            padding: 0,
            borderBottom: 'none',
            backgroundColor: 'transparent',
          }}
        >
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'contrato' ? 'active' : ''}`}
              type="button"
              onClick={() => handleTabClick('contrato')}
            >
              {t('tabs.contractData')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`}
              type="button"
              onClick={() => handleTabClick('endereco')}
            >
              {t('tabs.address')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'termos' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
              type="button"
              onClick={() => handleTabClick('termos', true)}
              disabled={!isEditMode}
            >
              {t('tabs.terms')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'financeiro' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
              type="button"
              onClick={() => handleTabClick('financeiro', true)}
              disabled={!isEditMode}
            >
              {t('tabs.financial')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'financeiro-avulso' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
              type="button"
              onClick={() => handleTabClick('financeiro-avulso', true)}
              disabled={!isEditMode}
            >
              {t('tabs.financialMisc')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'servicos-adicionais' ? 'active' : ''} ${!isEditMode ? 'contrato-tab-disabled' : ''}`}
              type="button"
              onClick={() => handleTabClick('servicos-adicionais', true)}
              disabled={!isEditMode}
            >
              {t('tabs.additionalServices')}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ContratoModalHeader;
