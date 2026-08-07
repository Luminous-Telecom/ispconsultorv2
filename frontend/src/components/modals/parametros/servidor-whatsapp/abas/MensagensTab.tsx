import React, { useEffect, useRef } from 'react';
import { FormField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import {
  MensagemTypeSelect,
  MensagemTipoEnvioRadio,
  MensagemVariavelCopyButton,
} from 'components/modals/parametros/servidor-shared';
import { MensagensTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const MensagensTab: React.FC<MensagensTabProps> = ({
  mensagemType,
  tipoEnvio,
  mensagemPadrao,
  mensagemManual = '',
  templateId = null as number | null,
  templateEntities = [],
  interacao1,
  interacao2,
  interacao3,
  isWhatsAppCloud = false,
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemPadraoChange,
  onMensagemManualChange,
  onTemplateIdChange,
  onInteracao1Change,
  onInteracao2Change,
  onInteracao3Change,
  onSaveMensagem: _onSaveMensagem,
  isPending: _isPending,
  variaveisData,
  onInsertVariable,
  onShowTemplates
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const textareas = containerRef.current.querySelectorAll('textarea');
    const cleanupFunctions: Array<() => void> = [];
    
    textareas.forEach((textarea) => {
      adjustTextareaHeight(textarea);
      
      const handleInput = () => {
        adjustTextareaHeight(textarea);
      };
      
      textarea.addEventListener('input', handleInput);
      
      cleanupFunctions.push(() => {
        textarea.removeEventListener('input', handleInput);
      });
    });

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [mensagemPadrao, mensagemManual, templateId, interacao1, interacao2, interacao3, mensagemType]);

  const handleVariableClick = (variable: string) => {
    if (onInsertVariable) {
      onInsertVariable(variable);
    } else {
      if (mensagemType === 'envio_manual' && onMensagemManualChange) {
        onMensagemManualChange(mensagemManual + variable);
      } else {
        onMensagemPadraoChange(mensagemPadrao + variable);
      }
    }
  };


  return (
    <div className="whatsapp-messages-container form-modal-simple" ref={containerRef}>
      <div className="row g-2">
        <div className="col-12">
          <MensagemTypeSelect value={mensagemType} onChange={onMensagemTypeChange} />
        </div>
      </div>

      {mensagemType && (
            <>
              {isWhatsAppCloud && onShowTemplates ? (
                <div className="row g-2 mt-2">
                  <div className="col-12">
                    <EntitySelectField
                      value={templateId ?? 0}
                      onChange={(value) => onTemplateIdChange?.(value === 0 ? null : value)}
                      onShowModal={onShowTemplates}
                      entities={templateEntities}
                      label={t('settings.messages.templateConfig')}
                      placeholder={t('placeholder.selectTemplate')}
                      searchButtonTitle={t('settings.messages.viewTemplates')}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="row g-2 mt-2">
                    <div className="col-12">
                      <MensagemTipoEnvioRadio
                        idPrefix="whatsapp"
                        value={tipoEnvio}
                        onChange={onTipoEnvioChange}
                        variant="full"
                      />
                    </div>
                  </div>

                  {mensagemType !== 'envio_manual' && (
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <FormField
                          name="mensagemPadrao"
                          type="textarea"
                          label={t('settings.messages.defaultMessage')}
                          placeholder={t('placeholder.defaultMessage')}
                          rows={10}
                          size="sm"
                          required
                          value={mensagemPadrao}
                          onChange={(value) => onMensagemPadraoChange(String(value ?? ''))}
                        />
                      </div>
                    </div>
                  )}

                  {mensagemType === 'envio_manual' && (
                    <div className="row g-2 mt-2">
                      <div className="col-12">
                        <FormField
                          name="mensagemManual"
                          type="textarea"
                          label={t('settings.messages.manualLabel')}
                          helpText={t('settings.messages.manualHelper')}
                          placeholder={t('placeholder.manualSend')}
                          rows={10}
                          size="sm"
                          required
                          value={mensagemManual}
                          onChange={(value) => onMensagemManualChange?.(String(value ?? ''))}
                        />
                      </div>
                    </div>
                  )}

                  <div className="row g-2 mt-2">
                    <div className="col-12">
                      <FormField
                        name="interacao1"
                        type="textarea"
                        label={t('settings.messages.interaction1')}
                        helpText={t('settings.messages.interaction1Helper')}
                        placeholder={t('placeholder.firstInteraction')}
                        rows={3}
                        size="sm"
                        value={interacao1}
                        onChange={(value) => onInteracao1Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mt-2">
                    <div className="col-12">
                      <FormField
                        name="interacao2"
                        type="textarea"
                        label={t('settings.messages.interaction2')}
                        helpText={t('settings.messages.interaction2Helper')}
                        placeholder={t('placeholder.secondInteraction')}
                        rows={3}
                        size="sm"
                        value={interacao2}
                        onChange={(value) => onInteracao2Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mt-2">
                    <div className="col-12">
                      <FormField
                        name="interacao3"
                        type="textarea"
                        label={t('settings.messages.interaction3')}
                        helpText={t('settings.messages.interaction3Helper')}
                        placeholder={t('placeholder.thirdInteraction')}
                        rows={3}
                        size="sm"
                        value={interacao3}
                        onChange={(value) => onInteracao3Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  {variaveisData && (
                <div className="row g-2 mt-2">
                  <div className="col-12">
                    <div className="form-section-heading-row">
                      <span className="form-section-heading-pill">
                        {t('settings.messages.variablesTitle')}
                      </span>
                      <div className="form-section-heading-line" aria-hidden />
                    </div>
                    <small className="form-helper-message d-block mb-2 form-modal-input-col">
                      {t('settings.messages.variablesHelper')}
                    </small>
                    <div className="scroll-max-400">
                        <div className="row g-2">
                          {Object.entries(variaveisData).map(([chave, grupo]) => (
                            <div key={chave} className="col-12">
                              <div className="form-section-heading-row">
                                <span className="form-section-heading-pill">{grupo.titulo}</span>
                                <div className="form-section-heading-line" aria-hidden />
                              </div>
                              <div className="row g-2">
                                {grupo.variaveis.map((variavel) => (
                                  <div key={variavel.variavel} className="col-12">
                                    <div className="d-flex align-items-center gap-2">
                                    <span
                                      className="badge bg-info text-dark whatsapp-var-badge"
                                      onClick={() => handleVariableClick(variavel.variavel)}
                                      title={`${variavel.descricao}. Clique para inserir.`}
                                    >
                                      {variavel.variavel}
                                    </span>
                                    <small className="text-muted">{variavel.descricao}</small>
                                    <MensagemVariavelCopyButton
                                      variable={variavel.variavel}
                                      title={t('settings.messages.copyVariable')}
                                    />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}
            </>
          )}
    </div>
  );
};

export default MensagensTab;
