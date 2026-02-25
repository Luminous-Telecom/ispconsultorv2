import React from 'react';
import { FormField } from '@/components/ui';
import RichTextEditor from '@/components/common/RichTextEditor';
import { MensagensTabProps } from '../types';
import { useI18n } from '@/contexts/I18nContext';

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
  isPending: _isPending
}) => {
  const { t } = useI18n();

  return (
    <div>
      <div className="row g-0 mb-0">
        <div className="col-md-6">
          <FormField
            name="mensagemType"
            type="select"
            label={t('settings.messages.type')}
            required={true}
            size="sm"
            value={mensagemType}
            onChange={(value) => onMensagemTypeChange(String(value ?? ''))}
            options={[
              { value: '10_dias_antes_vencimento', label: t('messages.types.10daysBefore') },
              { value: '05_dias_antes_vencimento', label: t('messages.types.05daysBefore') },
              { value: 'mesmo_dia_vencimento', label: t('messages.types.sameDay') },
              { value: '05_dias_depois_vencimento', label: t('messages.types.05daysAfter') },
              { value: '10_dias_depois_vencimento', label: t('messages.types.10daysAfter') },
              { value: '15_dias_depois_vencimento', label: t('messages.types.15daysAfter') },
              { value: 'corte_cliente', label: t('messages.types.clientCut') },
              { value: 'envio_manual', label: t('messages.types.manualSend') },
              { value: 'recibo_pagamento', label: t('messages.types.paymentReceipt') }
            ]}
          />
        </div>
        <div className="col-md-6">
          {mensagemType && (
            <div>
              <div className="form-label small">{t('settings.messages.sendType')}</div>
              <div className="btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="tipoEnvio"
                  id="envio-desativado-email"
                  value="desativado"
                  checked={tipoEnvio === 'desativado'}
                  onChange={(e) => onTipoEnvioChange(e.target.value as 'desativado' | 'pdf')}
                />
                <label className="btn btn-outline-primary" htmlFor="envio-desativado-email">
                  {t('messages.sendTypes.disabled')}
                </label>

                <input
                  type="radio"
                  className="btn-check"
                  name="tipoEnvio"
                  id="envio-pdf-email"
                  value="pdf"
                  checked={tipoEnvio === 'pdf'}
                  onChange={(e) => onTipoEnvioChange(e.target.value as 'desativado' | 'pdf')}
                />
                <label className="btn btn-outline-primary" htmlFor="envio-pdf-email">
                  {t('messages.sendTypes.pdf')}
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor de Texto */}
      {mensagemType && tipoEnvio === 'pdf' && (
        <>
          {/* Mensagem Manual - Apenas para tipo envio_manual */}
          {mensagemType === 'envio_manual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: '400px' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span id="mensagem-manual-label" className="form-label small mb-0">
                  {t('settings.messages.manualLabel')} <span className="text-danger">*</span>
                  <small className="text-muted d-block mt-1">{t('settings.messages.manualHelper')}</small>
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
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
              </div>
            </div>
          ) : (
            /* Mensagem Padrão - Para outros tipos */
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: '400px' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span id="mensagem-label" className="form-label small mb-0">{t('settings.messages.emailLabel')} <span className="text-danger">*</span></span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MensagensTab;

