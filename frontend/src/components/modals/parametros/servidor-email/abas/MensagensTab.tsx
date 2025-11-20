import React from 'react';
import { FormField } from '../../../../ui';
import RichTextEditor from '../../../../common/RichTextEditor';
import { MensagensTabProps } from '../types';

const MensagensTab: React.FC<MensagensTabProps> = ({
  mensagemType,
  tipoEnvio,
  mensagemTexto,
  mensagemManual = '<p></p>',
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemTextoChange,
  onMensagemManualChange,
  onSaveMensagem: _onSaveMensagem,
  isPending: _isPending
}) => {
  return (
    <div>
      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <FormField
            name="mensagemType"
            type="select"
            label="Tipo de Mensagem"
            required={true}
            size="sm"
            value={mensagemType}
            onChange={(value) => onMensagemTypeChange(String(value ?? ''))}
            options={[
              { value: '10_dias_antes_vencimento', label: '10 dias antes do vencimento' },
              { value: '05_dias_antes_vencimento', label: '05 dias antes do vencimento' },
              { value: 'mesmo_dia_vencimento', label: 'Mesmo dia do vencimento' },
              { value: '05_dias_depois_vencimento', label: '05 dias depois do vencimento' },
              { value: '10_dias_depois_vencimento', label: '10 dias depois do vencimento' },
              { value: '15_dias_depois_vencimento', label: '15 dias depois do vencimento' },
              { value: 'corte_cliente', label: 'Corte do cliente' },
              { value: 'envio_manual', label: 'Envio manual de cobrança' }
            ]}
          />
        </div>
        <div className="col-md-6">
          {mensagemType && (
            <div>
              <div className="form-label small">Tipo de Envio</div>
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
                <label className="btn btn-outline-secondary" htmlFor="envio-desativado-email">
                  Desativar
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
                <label className="btn btn-outline-secondary" htmlFor="envio-pdf-email">
                  Anexa PDF
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
                  Mensagem para Envio Manual <span className="text-danger">*</span>
                  <small className="text-muted d-block mt-1">Mensagem que será usada quando enviar título manualmente</small>
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <RichTextEditor
                  key={`mensagem-manual-email-${mensagemType || 'none'}`}
                  id="mensagem_manual_email"
                  name="mensagem_manual_email"
                  ariaLabelledBy="mensagem-manual-label"
                  value={mensagemManual || '<p></p>'}
                  onChange={onMensagemManualChange || (() => {})}
                  placeholder="Digite a mensagem para envio manual..."
                  height="100%"
                />
              </div>
            </div>
          ) : (
            /* Mensagem Padrão - Para outros tipos */
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: '400px' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span id="mensagem-label" className="form-label small mb-0">Mensagem do E-mail <span className="text-danger">*</span></span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <RichTextEditor
                  key={`mensagem-email-${mensagemType || 'none'}`}
                  id="mensagem_texto_email"
                  name="mensagem_texto_email"
                  ariaLabelledBy="mensagem-label"
                  value={mensagemTexto || '<p></p>'}
                  onChange={onMensagemTextoChange}
                  placeholder="Digite a mensagem padrão do e-mail..."
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

