import React, { Suspense } from 'react';
import { RichTextEditor, RichTextEditorFallback } from 'components/common/RichTextEditorLazy';
import { MensagemTypeSelect, MensagemTipoEnvioRadio } from 'components/modals/parametros/servidor-shared';
import { LabelWithHelp } from 'components/ui';
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
    <div className="form-modal-simple">
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
            <div className="row g-2 mt-2">
              <div className="col-12">
                <div className="form-field mensagem-editor-layout">
                  <LabelWithHelp id="mensagem-manual-label" className="form-label small" required>
                    {t('settings.messages.manualLabel')}
                  </LabelWithHelp>
                  <div className="form-field-control">
                    <small className="form-helper-message mb-1">{t('settings.messages.manualHelper')}</small>
                    <div className="flex-fill-min-h-0">
                      <Suspense fallback={<RichTextEditorFallback />}>
                        <RichTextEditor
                          key={`mensagem-manual-email-${mensagemType || 'none'}-${editorKey}`}
                          id="mensagem_manual_email"
                          name="mensagem_manual_email"
                          ariaLabelledBy="mensagem-manual-label"
                          value={mensagemManual || '<p></p>'}
                          onChange={onMensagemManualChange || (() => {})}
                          placeholder={t('placeholder.manualSend')}
                          height="100%"
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-2 mt-2">
              <div className="col-12">
                <div className="form-field mensagem-editor-layout">
                  <LabelWithHelp id="mensagem-label" className="form-label small" required>
                    {t('settings.messages.emailLabel')}
                  </LabelWithHelp>
                  <div className="form-field-control">
                    <div className="flex-fill-min-h-0">
                      <Suspense fallback={<RichTextEditorFallback />}>
                        <RichTextEditor
                          key={`mensagem-email-${mensagemType || 'none'}-${editorKey}`}
                          id="mensagem_texto_email"
                          name="mensagem_texto_email"
                          ariaLabelledBy="mensagem-label"
                          value={mensagemTexto || '<p></p>'}
                          onChange={onMensagemTextoChange}
                          placeholder={t('placeholder.defaultEmail')}
                          height="100%"
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MensagensTab;
