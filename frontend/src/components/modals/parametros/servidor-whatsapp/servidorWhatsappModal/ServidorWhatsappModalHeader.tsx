import React, { useMemo } from 'react';
import { FecharButton, LimparButton, RemoverButton, SalvarButton } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { ServidorWhatsAppForm } from '../types';
import { WhatsappActiveTab } from './constants';

interface ServidorWhatsappModalHeaderProps {
  activeTab: WhatsappActiveTab;
  setActiveTab: (tab: WhatsappActiveTab) => void;
  formData: ServidorWhatsAppForm;
  servidorAtivo?: { data?: { id?: number; tipo_api?: 'evolution' | 'whatsapp_cloud' } } | null;
  isSaveServidorPending: boolean;
  isSaveMensagemPending: boolean;
  onClose: () => void;
  onReset: () => void;
  onSaveMensagem: () => void;
  isPersisted?: boolean;
}

const ServidorWhatsappModalHeader: React.FC<ServidorWhatsappModalHeaderProps> = ({
  activeTab,
  setActiveTab,
  formData,
  servidorAtivo,
  isSaveServidorPending,
  isSaveMensagemPending,
  onClose,
  onReset,
  onSaveMensagem,
  isPersisted = false,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const showCloudTabs =
    formData.tipo_api === 'whatsapp_cloud' || servidorAtivo?.data?.tipo_api === 'whatsapp_cloud';

  const tabs = useMemo((): ModalTabItem<WhatsappActiveTab>[] => {
    const items: ModalTabItem<WhatsappActiveTab>[] = [
      { id: 'servidor', label: t('whatsappServer.server') },
      { id: 'mensagens', label: t('whatsappServer.messages'), disabled: !isPersisted },
    ];
    if (showCloudTabs) {
      items.push(
        { id: 'templates_meta', label: t('whatsappServer.templatesMeta'), disabled: !isPersisted },
        { id: 'templates', label: t('whatsappServer.templates'), disabled: !isPersisted }
      );
    }
    return items;
  }, [showCloudTabs, isPersisted, t]);

  const handleTabChange = (tab: WhatsappActiveTab) => {
    if (tab !== 'servidor' && !isPersisted) return;
    setActiveTab(tab);
  };

  return (
    <div className="whatsapp-header-unified">
      <div className="whatsapp-header-buttons modal-header-actions">
        <FecharButton type="button" onClick={onClose} isPending={isSaveServidorPending} />
        <SalvarButton
          type="button"
          onClick={(e) => {
            if (activeTab === 'servidor') {
              const form = document.getElementById('servidor-whatsapp-form') as HTMLFormElement;
              form?.requestSubmit();
            } else if (activeTab === 'mensagens') {
              e.preventDefault();
              onSaveMensagem();
            }
          }}
          disabled={activeTab === 'templates' || activeTab === 'templates_meta'}
          isPending={isSaveServidorPending || isSaveMensagemPending}
        />
        {servidorAtivo?.data ? (
          <RemoverButton type="button" onClick={onReset} disabled={isSaveServidorPending} />
        ) : (
          <LimparButton type="button" onClick={onReset} disabled={isSaveServidorPending} />
        )}
      </div>

      <div className="whatsapp-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          disabledClassName="whatsapp-tab-disabled"
          tabsClassName={`whatsapp-tabs-unified ${isMobile ? 'whatsapp-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="whatsappTab"
        />
      </div>
    </div>
  );
};

export default ServidorWhatsappModalHeader;
