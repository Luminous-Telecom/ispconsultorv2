import React, { useMemo } from 'react';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { ModalFormActions } from 'components/ui';
import type { SaasEmpresaTabId, SaasEmpresaTranslateFn } from './types';

interface SaasEmpresaFormHeaderProps {
  empresaId: number | null;
  activeTab: SaasEmpresaTabId;
  setActiveTab: (tab: SaasEmpresaTabId) => void;
  isMobile: boolean;
  isPending: boolean;
  onClose: () => void;
  t: SaasEmpresaTranslateFn;
}

const SaasEmpresaFormHeader: React.FC<SaasEmpresaFormHeaderProps> = ({
  empresaId,
  activeTab,
  setActiveTab,
  isMobile,
  isPending,
  onClose,
  t,
}) => {
  const empresaTabs = useMemo((): ModalTabItem<SaasEmpresaTabId>[] => [
    { id: 'dados-basicos', label: t('tabs.basicData') },
    { id: 'endereco', label: t('tabs.address') },
    { id: 'contato', label: t('tabs.contact') },
    { id: 'contratos', label: t('form.plan'), disabled: !empresaId },
    { id: 'usuarios', label: 'Usuários', disabled: !empresaId },
    { id: 'financeiro', label: t('tabs.financial'), disabled: !empresaId },
    { id: 'logs', label: 'Logs', disabled: !empresaId },
  ], [empresaId, t]);

  return (
    <div className="cliente-header-unified">
      <ModalFormActions
        className="cliente-header-buttons modal-header-actions"
        onCancel={onClose}
        formId="saas-empresa-form-id"
        isPending={isPending}
      />
      <div className="cliente-header-tabs">
        <ModalTabsOverflow
          tabs={empresaTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsClassName={`cliente-tabs-unified ${isMobile ? 'cliente-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="saas-empresa-tabs"
        />
      </div>
    </div>
  );
};

export default SaasEmpresaFormHeader;
