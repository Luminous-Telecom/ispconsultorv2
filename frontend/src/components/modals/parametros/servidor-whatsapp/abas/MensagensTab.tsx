import React from 'react';
import { FormField } from '../../../../ui';
import { MensagensTabProps } from '../types';

const MensagensTab: React.FC<MensagensTabProps> = ({
  mensagemType,
  tipoEnvio,
  mensagemPadrao,
  interacao1,
  interacao2,
  interacao3,
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemPadraoChange,
  onInteracao1Change,
  onInteracao2Change,
  onInteracao3Change,
  onSaveMensagem: _onSaveMensagem,
  isPending: _isPending,
  variaveisData,
  onCopyVariable,
  onInsertVariable
}) => {
  const handleVariableClick = (variable: string) => {
    if (onInsertVariable) {
      onInsertVariable(variable);
    } else {
      onMensagemPadraoChange(mensagemPadrao + variable);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header py-1 px-2">
          <small className="fw-bold mb-0">
            Configuração de Mensagens
          </small>
        </div>
        <div className="card-body p-2">
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="mensagemType"
                type="select"
                label="Mensagem"
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
                  { value: 'corte_cliente', label: 'Corte do cliente' }
                ]}
              />
            </div>
          </div>

          {mensagemType && (
            <>
              {/* Tipo de Envio */}
              <div className="row g-2 mt-2">
                <div className="col-12">
                  <div className="form-label small">Tipo de Envio</div>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="tipoEnvio"
                      id="envio-desativado"
                      value="desativado"
                      checked={tipoEnvio === 'desativado'}
                      onChange={(e) => onTipoEnvioChange(e.target.value as 'desativado' | 'pdf')}
                    />
                    <label className="btn btn-outline-secondary" htmlFor="envio-desativado">
                      Desativar
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      name="tipoEnvio"
                      id="envio-pdf"
                      value="pdf"
                      checked={tipoEnvio === 'pdf'}
                      onChange={(e) => onTipoEnvioChange(e.target.value as 'desativado' | 'pdf')}
                    />
                    <label className="btn btn-outline-secondary" htmlFor="envio-pdf">
                      Anexa PDF
                    </label>
                  </div>
                </div>
              </div>

              {/* Mensagem Padrão */}
              <div className="row g-2 mt-2">
                <div className="col-12">
                  <FormField
                    name="mensagemPadrao"
                    type="textarea"
                    label="Mensagem Padrão"
                    placeholder="Digite a mensagem padrão"
                    rows={10}
                    size="sm"
                    value={mensagemPadrao}
                    onChange={(value) => onMensagemPadraoChange(String(value ?? ''))}
                  />
                </div>
              </div>

              {/* Container de Variáveis */}
              {variaveisData && (
                <div className="row g-2 mt-2">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header py-1 px-2">
                        <small className="fw-bold mb-0">Variáveis Disponíveis para Mensagens</small>
                      </div>
                      <div className="card-body p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <div className="row g-2">
                          {Object.entries(variaveisData).map(([chave, grupo]) => (
                            <div className="col-md-6" key={chave}>
                              <div className="mb-2">
                                <small className="fw-bold d-block mb-1">{grupo.titulo}</small>
                                <div className="d-flex flex-wrap gap-1 align-items-center">
                                  {grupo.variaveis.map((variavel) => (
                                    <div key={variavel.variavel} className="d-flex align-items-center gap-1">
                                      <span
                                        className="badge bg-secondary"
                                        style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                        onClick={() => handleVariableClick(variavel.variavel)}
                                        title={`${variavel.descricao}. Clique para inserir.`}
                                      >
                                        {variavel.variavel}
                                      </span>
                                      {onCopyVariable && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-link p-0"
                                          onClick={() => onCopyVariable(variavel.variavel)}
                                          title="Copiar variável"
                                        >
                                          <i className="bi bi-clipboard" style={{ fontSize: '0.75rem' }}></i>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Interações (opcionais) */}
              <div className="row g-2 mt-2">
                <div className="col-12">
                  <FormField
                    name="interacao1"
                    type="textarea"
                    label="Interação 01"
                    placeholder="Digite a primeira mensagem"
                    rows={3}
                    size="sm"
                    value={interacao1}
                    onChange={(value) => onInteracao1Change(String(value ?? ''))}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="interacao2"
                    type="textarea"
                    label="Interação 02"
                    placeholder="Digite a segunda mensagem"
                    rows={3}
                    size="sm"
                    value={interacao2}
                    onChange={(value) => onInteracao2Change(String(value ?? ''))}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="interacao3"
                    type="textarea"
                    label="Interação 03"
                    placeholder="Digite a terceira mensagem"
                    rows={3}
                    size="sm"
                    value={interacao3}
                    onChange={(value) => onInteracao3Change(String(value ?? ''))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MensagensTab;

