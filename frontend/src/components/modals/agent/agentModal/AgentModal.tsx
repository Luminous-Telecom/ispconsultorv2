import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import { useI18n } from 'contexts/I18nContext';
import AgentModalHeader from './AgentModalHeader';
import AgentModalConfigTab from './AgentModalConfigTab';
import AgentModalInstallAutoTab from './AgentModalInstallAutoTab';
import AgentModalInstallManualTab from './AgentModalInstallManualTab';
import { useAgentModal } from './useAgentModal';
import { AgentModalProps } from './types';

const AgentModal: React.FC<AgentModalProps> = (props) => {
  const { t } = useI18n();
  const modal = useAgentModal(props);

  const headerActions = (
    <AgentModalHeader
      activeTab={modal.activeTab}
      setActiveTab={modal.setActiveTab}
      canUseInstallTabs={modal.canUseInstallTabs}
      isEditing={modal.isEditing}
      isSubmitting={modal.isSubmitting}
      installStatus={modal.installStatus}
      isRunning={modal.isRunning}
      isDone={modal.isDone}
      generatedCmd={modal.generatedCmd}
      generating={modal.generating}
      onClose={modal.handleClose}
      onSubmit={modal.handleSubmit}
      onInstall={modal.handleInstall}
      onGenerateCmd={modal.handleGenerateCmd}
    />
  );

  return (
    <>
      <DraggableModal
        show={props.show}
        onClose={modal.handleClose}
        title={modal.isEditing ? `Editar Agente — ${modal.agentData?.name}` : 'Novo Agente'}
        size="md"
        headerActions={headerActions}
      >
        <div className="banco-modal-content">
          <div className="tab-content banco-tab-content banco-tab-content-padded">
            {modal.activeTab === 'config' && (
              <AgentModalConfigTab
                isEditing={modal.isEditing}
                isAdmin={modal.isAdmin}
                me={modal.me}
                clienteId={modal.clienteId}
                agentData={modal.agentData}
                agentFormData={modal.formData}
                errors={modal.errors}
                adminClienteId={modal.adminClienteId}
                adminClienteNome={modal.adminClienteNome}
                dadosEmpresaTenant={modal.dadosEmpresaTenant}
                clienteEdicaoLabel={modal.clienteEdicaoLabel}
                regeneratePending={modal.regenerateMutation.isPending}
                t={t}
                setField={modal.set}
                setErrors={modal.setErrors}
                setAdminClienteId={modal.setAdminClienteId}
                setAdminClienteNome={modal.setAdminClienteNome}
                onShowClientePicker={() => modal.setShowClientePicker(true)}
                onFormSubmit={modal.handleSubmit}
                onRegenerate={modal.handleRegenerate}
              />
            )}

            {modal.activeTab === 'install-auto' && (
              <AgentModalInstallAutoTab
                installStatus={modal.installStatus}
                sshForm={modal.sshForm}
                sshErrors={modal.sshErrors}
                logs={modal.logs}
                logEndRef={modal.logEndRef}
                isRunning={modal.isRunning}
                isDone={modal.isDone}
                setSsh={modal.setSsh}
              />
            )}

            {modal.activeTab === 'install-manual' && (
              <AgentModalInstallManualTab
                generating={modal.generating}
                generatedCmd={modal.generatedCmd}
                cmdCopied={modal.cmdCopied}
                copiedLabel={t('blockdomi.copiedToClipboard')}
                onCopy={modal.handleCopy}
              />
            )}
          </div>
        </div>
      </DraggableModal>

      <ClienteListModal
        show={modal.showClientePicker}
        onClose={() => modal.setShowClientePicker(false)}
        onSelectClient={modal.handleSelectCliente}
        title={t('ui.selectClient')}
      />
    </>
  );
};

export default AgentModal;
