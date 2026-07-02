import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import SshDeviceBackupsPanel from '../SshDeviceBackupsPanel';
import SshDeviceModalDadosTab from './SshDeviceModalDadosTab';
import SshDeviceModalHeader from './SshDeviceModalHeader';
import SshDeviceModalLoadingState from './SshDeviceModalLoadingState';
import SshDeviceModalSubModals from './SshDeviceModalSubModals';
import { useSshDeviceModal } from './useSshDeviceModal';
import { SshDeviceModalProps } from './types';

const SshDeviceModal: React.FC<SshDeviceModalProps> = (props) => {
  const { show, onClose, deviceId } = props;
  const modal = useSshDeviceModal(props);

  const headerActions = modal.showHeaderActions ? (
    <SshDeviceModalHeader
      activeTab={modal.activeTab}
      isMobile={modal.isMobile}
      isSubmitting={modal.isSubmitting}
      formId={modal.formId}
      canOpenBackupsTab={modal.canOpenBackupsTab}
      basicDataLabel={modal.t('tabs.basicData')}
      backupsLabel={modal.t('tabs.sshDeviceBackups')}
      onClose={onClose}
      onTabChange={modal.setActiveTab}
    />
  ) : undefined;

  const renderContent = () => {
    if (modal.isLoading && modal.isEditing) {
      return <SshDeviceModalLoadingState />;
    }

    return (
      <form id={modal.formId} onSubmit={modal.handleSubmit} className="form-modal-simple">
        <div className="plano-modal-content">
          <div
            className={`tab-content plano-tab-content ${
              modal.activeTab === 'backups'
                ? 'plano-tab-content-scrollable'
                : 'plano-tab-content-padded plano-tab-content-scrollable'
            }`}
            id="sshDeviceTabContent"
          >
            {modal.activeTab === 'dados' && (
              <SshDeviceModalDadosTab
                isEditing={modal.isEditing}
                isAdmin={modal.isAdmin}
                defaultClienteId={modal.defaultClienteId}
                me={modal.me}
                adminClienteId={modal.adminClienteId}
                adminClienteNome={modal.adminClienteNome}
                clienteEdicaoLabel={modal.clienteEdicaoLabel}
                dadosEmpresaTenant={modal.dadosEmpresaTenant}
                agentEntities={modal.agentEntities}
                formData={modal.formData}
                errors={modal.errors}
                agendamentoBackup={modal.agendamentoBackup}
                onFieldChange={modal.setField}
                onDeviceTypeChange={modal.handleDeviceTypeChange}
                onAdminClienteChange={modal.handleAdminClienteChange}
                onShowClientePicker={() => modal.setShowClientePicker(true)}
                onShowAgentPicker={() => modal.setShowAgentPicker(true)}
              />
            )}
            {modal.activeTab === 'backups' && modal.canOpenBackupsTab && deviceId && (
              <SshDeviceBackupsPanel deviceId={deviceId} variant="tab" />
            )}
          </div>
        </div>
      </form>
    );
  };

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={modal.modalTitle}
        size="lg"
        modalId={modal.modalId}
        headerActions={headerActions}
      >
        {renderContent()}
      </DraggableModal>

      <SshDeviceModalSubModals
        showClientePicker={modal.showClientePicker}
        showAgentPicker={modal.showAgentPicker}
        effectiveClienteId={modal.effectiveClienteId}
        selectClientTitle={modal.t('ui.selectClient')}
        selectAgentTitle={modal.t('ui.selectAgent')}
        onCloseClientePicker={() => modal.setShowClientePicker(false)}
        onCloseAgentPicker={() => modal.setShowAgentPicker(false)}
        onSelectCliente={modal.handleSelectCliente}
        onSelectAgent={modal.handleSelectAgent}
      />
    </>
  );
};

export default SshDeviceModal;
