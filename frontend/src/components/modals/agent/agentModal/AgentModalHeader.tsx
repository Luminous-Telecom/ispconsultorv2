import React from 'react';
import {
  CancelarButton,
  FecharButton,
  GerarButton,
  InstalarAgenteButton,
  NovoButton,
  SalvarButton,
} from 'components/ui';
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
}) => (
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
      <ul
        className="nav nav-tabs banco-tabs-unified"
        role="tablist"
        style={{ margin: 0, padding: 0, borderBottom: 'none', backgroundColor: 'transparent' }}
      >
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link modal-tab-hover ${activeTab === 'config' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('config')}
          >
            Configurações
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link modal-tab-hover ${activeTab === 'install-auto' ? 'active' : ''}`}
            type="button"
            disabled={!canUseInstallTabs}
            title={!canUseInstallTabs ? 'Crie o agente na aba Configurações' : undefined}
            onClick={() => canUseInstallTabs && setActiveTab('install-auto')}
          >
            Instalar Automático
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link modal-tab-hover ${activeTab === 'install-manual' ? 'active' : ''}`}
            type="button"
            disabled={!canUseInstallTabs}
            title={!canUseInstallTabs ? 'Crie o agente na aba Configurações' : undefined}
            onClick={() => canUseInstallTabs && setActiveTab('install-manual')}
          >
            Instalar Manual
          </button>
        </li>
      </ul>
    </div>
  </div>
);

export default AgentModalHeader;
