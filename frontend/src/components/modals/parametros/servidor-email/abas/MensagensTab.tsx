import React from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import { MensagemTypeSelect, MensagemTipoEnvioRadio } from 'components/modals/parametros/servidor-shared';
import { MensagensTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const MensagensTab: React.FC<MensagensTabProps> = ({
  mensagemType,
  tipoEnvio,
  mensagemTexto,
  mensagemManual = '<p></p>',
  editorKey = 0,
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemTextoChange,
  onMensagemManualChange,
  onSaveMensagem: _onSaveMensagem,
  isPending: _isPending,
}) => {
  const { t } = useI18n();

  return (
    <div className="modal-rich-text-editor-host">
      <div className="row g-2">
        <div className="col-12">
          <MensagemTypeSelect value={mensagemType} onChange={onMensagemTypeChange} />
        </div>
        <div className="col-12">
          {mensagemType && (
            <MensagemTipoEnvioRadio
              idPrefix="email"
              value={tipoEnvio}
              onChange={onTipoEnvioChange}
              variant="compact"
            />
          )}
        </div>
      </div>

      {mensagemType && tipoEnvio === 'pdf' && (
        <>
          {mensagemType === 'envio_manual' ? (
            <ModalRichTextEditor
              className="mt-2"
              editorKey={`mensagem-manual-email-${mensagemType || 'none'}-${editorKey}`}
              id="mensagem_manual_email"
              name="mensagem_manual_email"
              labelId="mensagem-manual-label"
              label={t('settings.messages.manualLabel')}
              helperText={t('settings.messages.manualHelper')}
              required
              value={mensagemManual || '<p></p>'}
              onChange={onMensagemManualChange || (() => {})}
              placeholder={t('placeholder.manualSend')}
            />
          ) : (
            <ModalRichTextEditor
              className="mt-2"
              editorKey={`mensagem-email-${mensagemType || 'none'}-${editorKey}`}
              id="mensagem_texto_email"
              name="mensagem_texto_email"
              labelId="mensagem-label"
              label={t('settings.messages.emailLabel')}
              required
              value={mensagemTexto || '<p></p>'}
              onChange={onMensagemTextoChange}
              placeholder={t('placeholder.defaultEmail')}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MensagensTab;
