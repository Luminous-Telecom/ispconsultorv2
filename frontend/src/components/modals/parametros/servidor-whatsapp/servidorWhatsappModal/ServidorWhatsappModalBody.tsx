import React from 'react';
import { Loading } from 'components/ui';
import ServidorTab from '../abas/ServidorTab';
import MensagensTab from '../abas/MensagensTab';
import TemplatesTab from '../abas/TemplatesTab';
import TemplatesMetaTab from '../abas/TemplatesMetaTab';
import TemplateSelectModal from '../TemplateSelectModal';
import { ServidorWhatsAppForm } from '../types';
import { GrupoVariaveis, WhatsappActiveTab } from './constants';

interface ServidorWhatsappModalBodyProps {
  isLoading: boolean;
  loadingLabel: string;
  activeTab: WhatsappActiveTab;
  formData: ServidorWhatsAppForm;
  onFormFieldChange: (field: keyof ServidorWhatsAppForm, value: string | 'evolution' | 'whatsapp_cloud') => void;
  isSaveServidorPending: boolean;
  servidorAtivo?: { data?: { id?: number; tipo_api?: 'evolution' | 'whatsapp_cloud' } } | null;
  testPhone: string;
  testMessage: string;
  onTestPhoneChange: (value: string) => void;
  onTestMessageChange: (value: string) => void;
  onSendTestMessage: () => void;
  isSendingTest: boolean;
  onSubmit: (e: React.FormEvent) => void;
  mensagemType: string;
  tipoEnvio: 'desativado' | 'pdf';
  mensagemPadrao: string;
  mensagemManual: string;
  templateId: number | null;
  templateEntities: Array<{ id: number; nome: string }>;
  interacao1: string;
  interacao2: string;
  interacao3: string;
  onMensagemTypeChange: (value: string) => void;
  onTipoEnvioChange: (value: 'desativado' | 'pdf') => void;
  onMensagemPadraoChange: (value: string) => void;
  onMensagemManualChange: (value: string) => void;
  onTemplateIdChange: (value: number | null) => void;
  onInteracao1Change: (value: string) => void;
  onInteracao2Change: (value: string) => void;
  onInteracao3Change: (value: string) => void;
  onSaveMensagem: () => void;
  isSaveMensagemPending: boolean;
  variaveisData?: Record<string, GrupoVariaveis>;
  onInsertVariable: (variable: string) => void;
  onShowTemplates: () => void;
  showTemplateSelectModal: boolean;
  onCloseTemplateSelectModal: () => void;
  onTemplateSelect: (selection: { template_id: number; nome?: string; idioma?: string }) => void;
}

const ServidorWhatsappModalBody: React.FC<ServidorWhatsappModalBodyProps> = ({
  isLoading,
  loadingLabel,
  activeTab,
  formData,
  onFormFieldChange,
  isSaveServidorPending,
  servidorAtivo,
  testPhone,
  testMessage,
  onTestPhoneChange,
  onTestMessageChange,
  onSendTestMessage,
  isSendingTest,
  onSubmit,
  mensagemType,
  tipoEnvio,
  mensagemPadrao,
  mensagemManual,
  templateId,
  templateEntities,
  interacao1,
  interacao2,
  interacao3,
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemPadraoChange,
  onMensagemManualChange,
  onTemplateIdChange,
  onInteracao1Change,
  onInteracao2Change,
  onInteracao3Change,
  onSaveMensagem,
  isSaveMensagemPending,
  variaveisData,
  onInsertVariable,
  onShowTemplates,
  showTemplateSelectModal,
  onCloseTemplateSelectModal,
  onTemplateSelect,
}) => (
  <>
    {isLoading ? (
      <Loading variant="modal" message={loadingLabel} />
    ) : (
      <div className="whatsapp-modal-content">
        <div
          className={`tab-content whatsapp-tab-content whatsapp-tab-content-scrollable ${
            activeTab === 'templates' || activeTab === 'templates_meta' ? '' : 'whatsapp-tab-content-padded'
          }`}
          id="whatsappTabContent"
        >
          {activeTab === 'servidor' && (
            <form id="servidor-whatsapp-form" onSubmit={onSubmit} className="form-modal-simple">
              <ServidorTab
                formData={formData}
                onChange={onFormFieldChange}
                isPending={isSaveServidorPending}
                servidorAtivo={servidorAtivo}
                testPhone={testPhone}
                testMessage={testMessage}
                onTestPhoneChange={onTestPhoneChange}
                onTestMessageChange={onTestMessageChange}
                onSendTestMessage={onSendTestMessage}
                isSendingTest={isSendingTest}
              />
            </form>
          )}

          {activeTab === 'mensagens' && (
            <MensagensTab
              mensagemType={mensagemType}
              tipoEnvio={tipoEnvio}
              mensagemPadrao={mensagemPadrao}
              mensagemManual={mensagemManual}
              templateId={templateId}
              templateEntities={templateEntities}
              interacao1={interacao1}
              interacao2={interacao2}
              interacao3={interacao3}
              isWhatsAppCloud={servidorAtivo?.data?.tipo_api === 'whatsapp_cloud'}
              onMensagemTypeChange={onMensagemTypeChange}
              onTipoEnvioChange={onTipoEnvioChange}
              onMensagemPadraoChange={onMensagemPadraoChange}
              onMensagemManualChange={onMensagemManualChange}
              onTemplateIdChange={onTemplateIdChange}
              onInteracao1Change={onInteracao1Change}
              onInteracao2Change={onInteracao2Change}
              onInteracao3Change={onInteracao3Change}
              onSaveMensagem={onSaveMensagem}
              isPending={isSaveMensagemPending}
              variaveisData={variaveisData}
              onInsertVariable={onInsertVariable}
              onShowTemplates={onShowTemplates}
            />
          )}

          {activeTab === 'templates_meta' && <TemplatesMetaTab enabled={true} />}
          {activeTab === 'templates' && <TemplatesTab />}
        </div>
      </div>
    )}

    {showTemplateSelectModal && (
      <TemplateSelectModal
        show={showTemplateSelectModal}
        onClose={onCloseTemplateSelectModal}
        onSelect={onTemplateSelect}
      />
    )}
  </>
);

export default ServidorWhatsappModalBody;
