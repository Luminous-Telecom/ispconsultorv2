import React, { useMemo } from 'react';
import {
  CancelarButton,
  FecharButton,
  GerarButton,
  InstalarAgenteButton,
  NovoButton,
  SalvarButton,
} from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { ActiveTab } from './types';

interface AgentModalHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  canUseInstallTabs: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  installStatus: 'idle' | 'running' | 'success' | 'error';
  isRunning: boolean;
  isDone: boolean;
  generatedCmd: string;
  generating: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInstall: () => void;
  onGenerateCmd: () => void;
}

const AgentModalHeader: React.FC<AgentModalHeaderProps> = ({
  activeTab,
  setActiveTab,
  canUseInstallTabs,
  isEditing,
  isSubmitting,
  installStatus,
  isRunning,
  isDone,
  generatedCmd,
  generating,
  onClose,
  onSubmit,
  onInstall,
  onGenerateCmd,
}) => {
  const tabs = useMemo(
    (): ModalTabItem<ActiveTab>[] => [
      { id: 'config', label: 'Configurações' },
      {
        id: 'install-auto',
        label: 'Instalar Automático',
        disabled: !canUseInstallTabs,
      },
      {
        id: 'install-manual',
        label: 'Instalar Manual',
        disabled: !canUseInstallTabs,
      },
    ],
    [canUseInstallTabs]
  );

  const handleTabChange = (tab: ActiveTab) => {
    if ((tab === 'install-auto' || tab === 'install-manual') && !canUseInstallTabs) return;
    setActiveTab(tab);
  };

  return (
    <div className="banco-header-unified">
      <div className="banco-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
        {activeTab === 'config' && (
          <>
            <CancelarButton type="button" onClick={onClose} isPending={isSubmitting} />
            {isEditing ? (
              <SalvarButton type="button" onClick={onSubmit} isPending={isSubmitting} />
            ) : (
              <NovoButton entity="Agente" type="button" onClick={onSubmit} isPending={isSubmitting} />
            )}
          </>
        )}
        {activeTab === 'install-auto' && installStatus === 'idle' && (
          <>
            <CancelarButton type="button" onClick={onClose} />
            <InstalarAgenteButton type="button" onClick={onInstall} />
          </>
        )}
        {activeTab === 'install-auto' && isRunning && (
          <CancelarButton type="button" variant="danger" onClick={onClose} />
        )}
        {activeTab === 'install-auto' && isDone && (
          <FecharButton type="button" onClick={onClose} />
        )}
        {activeTab === 'install-manual' && !generatedCmd && !generating && (
          <>
            <CancelarButton type="button" onClick={onClose} />
            <GerarButton type="button" onClick={onGenerateCmd} />
          </>
        )}
        {activeTab === 'install-manual' && (generatedCmd || generating) && (
          <FecharButton type="button" onClick={onClose} />
        )}
      </div>

      <div className="banco-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsClassName="banco-tabs-unified"
        />
      </div>
    </div>
  );
};

export default AgentModalHeader;
