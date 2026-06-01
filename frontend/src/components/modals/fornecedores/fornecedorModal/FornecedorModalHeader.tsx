import React, { useMemo } from 'react';
import { ModalFormActions } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { FornecedorTab } from './types';

interface FornecedorModalHeaderProps {
  activeTab: FornecedorTab;
  isMobile: boolean;
  isSubmitting: boolean;
  formId: string;
  basicDataLabel: string;
  addressLabel: string;
  observationsLabel: string;
  onClose: () => void;
  onTabChange: (tab: FornecedorTab) => void;
}

const FornecedorModalHeader: React.FC<FornecedorModalHeaderProps> = ({
  activeTab,
  isMobile,
  isSubmitting,
  formId,
  basicDataLabel,
  addressLabel,
  observationsLabel,
  onClose,
  onTabChange,
}) => {
  const tabs = useMemo(
    (): ModalTabItem<FornecedorTab>[] => [
      { id: 'dados-basicos', label: basicDataLabel },
      { id: 'endereco', label: addressLabel },
      { id: 'observacoes', label: observationsLabel },
    ],
    [addressLabel, basicDataLabel, observationsLabel]
  );

  return (
    <div className="fornecedor-header-unified">
      <ModalFormActions
        className="fornecedor-header-buttons modal-header-actions"
        onCancel={onClose}
        formId={formId}
        isPending={isSubmitting}
      />
      <div className="fornecedor-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          tabsClassName={`fornecedor-tabs-unified ${isMobile ? 'fornecedor-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="fornecedorTab"
        />
      </div>
    </div>
  );
};

export default FornecedorModalHeader;
