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
    <div>
      <div className="row g-0 mb-0">
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 300px)',
                minHeight: '400px',
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <LabelWithHelp id="mensagem-manual-label" as="span" className="form-label small mb-0" required>
                  {t('settings.messages.manualLabel')}
                </LabelWithHelp>
              </div>
              <small className="text-muted form-hint d-block mb-1">{t('settings.messages.manualHelper')}</small>
              <div style={{ flex: 1, minHeight: 0 }}>
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
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 300px)',
                minHeight: '400px',
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <LabelWithHelp id="mensagem-label" as="span" className="form-label small mb-0" required>
                  {t('settings.messages.emailLabel')}
                </LabelWithHelp>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
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
          )}
        </>
      )}
    </div>
  );
};

export default MensagensTab;
