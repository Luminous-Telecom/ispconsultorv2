import React from 'react';
import { ModalFormActions } from 'components/ui';
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
}) => (
  <div className="fornecedor-header-unified">
    <ModalFormActions
      className="fornecedor-header-buttons modal-header-actions"
      onCancel={onClose}
      formId={formId}
      isPending={isSubmitting}
    />

    <div className="fornecedor-header-tabs">
      <ul
        className={`nav nav-tabs fornecedor-tabs-unified ${isMobile ? 'fornecedor-tabs-mobile' : ''}`}
        id="fornecedorTab"
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
            className={`nav-link modal-tab-hover ${activeTab === 'dados-basicos' ? 'active' : ''}`}
            type="button"
            onClick={() => onTabChange('dados-basicos')}
          >
            {basicDataLabel}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`}
            type="button"
            onClick={() => onTabChange('endereco')}
          >
            {addressLabel}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link modal-tab-hover ${activeTab === 'observacoes' ? 'active' : ''}`}
            type="button"
            onClick={() => onTabChange('observacoes')}
          >
            {observationsLabel}
          </button>
        </li>
      </ul>
    </div>
  </div>
);

export default FornecedorModalHeader;
