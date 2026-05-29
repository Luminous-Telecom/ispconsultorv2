import React from 'react';
import { FecharButton, LimparButton, RemoverButton, SalvarButton } from 'components/ui';
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
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

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
        <ul
          className={`nav nav-tabs whatsapp-tabs-unified ${isMobile ? 'whatsapp-tabs-mobile' : ''}`}
          id="whatsappTab"
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
              className={`nav-link modal-tab-hover ${activeTab === 'servidor' ? 'active' : ''}`}
              onClick={() => setActiveTab('servidor')}
              type="button"
            >
              {t('whatsappServer.server')}
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'mensagens' ? 'active' : ''}`}
              onClick={() => setActiveTab('mensagens')}
              type="button"
            >
              {t('whatsappServer.messages')}
            </button>
          </li>
          {(formData.tipo_api === 'whatsapp_cloud' || servidorAtivo?.data?.tipo_api === 'whatsapp_cloud') && (
            <>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'templates_meta' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates_meta')}
                  type="button"
                >
                  {t('whatsappServer.templatesMeta')}
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'templates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('templates')}
                  type="button"
                >
                  {t('whatsappServer.templates')}
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ServidorWhatsappModalHeader;
