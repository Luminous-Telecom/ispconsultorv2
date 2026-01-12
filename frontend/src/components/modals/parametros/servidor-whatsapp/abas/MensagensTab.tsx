import React, { useEffect, useRef } from 'react';
import { FormField, Button } from '@/components/ui';
import { MensagensTabProps } from '../types';

const MensagensTab: React.FC<MensagensTabProps> = ({
  mensagemType,
  tipoEnvio,
  mensagemPadrao,
  mensagemManual = '',
  templateMapping = '',
  interacao1,
  interacao2,
  interacao3,
  isWhatsAppCloud = false,
  onMensagemTypeChange,
  onTipoEnvioChange,
  onMensagemPadraoChange,
  onMensagemManualChange,
  onTemplateMappingChange,
  onInteracao1Change,
  onInteracao2Change,
  onInteracao3Change,
  onSaveMensagem: _onSaveMensagem,
  isPending: _isPending,
  variaveisData,
  onCopyVariable,
  onInsertVariable,
  onShowTemplates
}) => {
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
  }, [mensagemPadrao, mensagemManual, interacao1, interacao2, interacao3, mensagemType]);

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
    <div className="whatsapp-messages-container" ref={containerRef}>
      <div className="card">
        <div className="card-header py-2 px-3">
          <h6 className="mb-0 d-flex align-items-center">
            <i className="bi bi-chat-dots me-2"></i>
            Configuração de Mensagens
          </h6>
        </div>
        <div className="card-body p-3">
          <div className="row g-0">
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
                  { value: 'corte_cliente', label: 'Corte do cliente' },
                  { value: 'envio_manual', label: 'Envio manual de cobrança' }
                ]}
              />
            </div>
          </div>

          {mensagemType && (
            <>
              {/* Template Mapping (WhatsApp Cloud API) - Mostrar apenas para WhatsApp Cloud */}
              {isWhatsAppCloud && onTemplateMappingChange ? (
                <>
                  <div className="row g-0 mt-3">
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label mb-0">
                          <i className="bi bi-code-square me-2"></i>
                          Configuração de Template (JSON) - WhatsApp Cloud API
                        </label>
                        {onShowTemplates && (
                          <Button
                            type="button"
                            variant="outline-primary"
                            size="sm"
                            leftIcon={<i className="bi bi-list-ul"></i>}
                            onClick={onShowTemplates}
                          >
                            Ver Templates Ativos
                          </Button>
                        )}
                      </div>
                      <small className="text-muted d-block mt-1 mb-2">
                        Configure o template e variáveis para WhatsApp Cloud API. Deixe vazio para usar mensagem de texto normal.
                      </small>
                      <FormField
                        name="templateMapping"
                        type="textarea"
                        label=""
                        placeholder='{"name": "fatura_pdf", "language": "en", "variables": ["cliente.razao_social", "titulo.valor_final", "titulo.data_vencimento", "dias_vencimento"]}'
                        rows={6}
                        size="sm"
                        value={templateMapping}
                        onChange={(value) => onTemplateMappingChange(String(value ?? ''))}
                      />
                      <small className="text-muted d-block mt-1">
                        <strong>Formato:</strong> JSON com <code>name</code> (nome do template), <code>language</code> (idioma: en, pt_BR, etc) e <code>variables</code> (array com ordem das variáveis).
                      </small>
                    </div>
                  </div>

                </>
              ) : (
                <>
                  {/* Tipo de Envio - Apenas para Evolution API */}
                  <div className="row g-0 mt-3">
                    <div className="col-12">
                      <label className="form-label mb-2">
                        <i className="bi bi-send me-2"></i>
                        Tipo de Envio
                      </label>
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
                        <label className="btn btn-outline-primary" htmlFor="envio-desativado">
                          <i className="bi bi-x-circle me-1"></i>
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
                        <label className="btn btn-outline-primary" htmlFor="envio-pdf">
                          <i className="bi bi-file-pdf me-1"></i>
                          Anexa PDF
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Mensagem Padrão - Apenas para Evolution API */}
                  <div className="row g-0 mt-3">
                    <div className="col-12">
                      <div className="mb-2">
                        <label className="form-label">
                          <i className="bi bi-chat-text me-2"></i>
                          Mensagem Padrão
                        </label>
                      </div>
                      <FormField
                        name="mensagemPadrao"
                        type="textarea"
                        label=""
                        placeholder="Digite a mensagem padrão que será enviada..."
                        rows={10}
                        size="sm"
                        value={mensagemPadrao}
                        onChange={(value) => onMensagemPadraoChange(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  {/* Mensagem Manual - Apenas para tipo envio_manual */}
                  {mensagemType === 'envio_manual' && (
                    <div className="row g-0 mt-3">
                      <div className="col-12">
                        <div className="mb-2">
                          <label className="form-label">
                            <i className="bi bi-send me-2"></i>
                            Mensagem para Envio Manual
                          </label>
                          <small className="text-muted d-block">Mensagem que será usada quando enviar título manualmente</small>
                        </div>
                        <FormField
                          name="mensagemManual"
                          type="textarea"
                          label=""
                          placeholder="Digite a mensagem para envio manual..."
                          rows={10}
                          size="sm"
                          value={mensagemManual}
                          onChange={(value) => onMensagemManualChange?.(String(value ?? ''))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Interações (opcionais) - Apenas para Evolution API */}
                  <div className="row g-0 mt-3">
                    <div className="col-12">
                      <div className="mb-2">
                        <label className="form-label">
                          <i className="bi bi-chat-left-text me-2"></i>
                          Interação 01
                        </label>
                        <small className="text-muted d-block">Mensagem opcional para primeira interação</small>
                      </div>
                      <FormField
                        name="interacao1"
                        type="textarea"
                        label=""
                        placeholder="Digite a primeira mensagem de interação..."
                        rows={3}
                        size="sm"
                        value={interacao1}
                        onChange={(value) => onInteracao1Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  <div className="row g-0 mt-2">
                    <div className="col-12">
                      <div className="mb-2">
                        <label className="form-label">
                          <i className="bi bi-chat-left-text me-2"></i>
                          Interação 02
                        </label>
                        <small className="text-muted d-block">Mensagem opcional para segunda interação</small>
                      </div>
                      <FormField
                        name="interacao2"
                        type="textarea"
                        label=""
                        placeholder="Digite a segunda mensagem de interação..."
                        rows={3}
                        size="sm"
                        value={interacao2}
                        onChange={(value) => onInteracao2Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  <div className="row g-0 mt-2">
                    <div className="col-12">
                      <div className="mb-2">
                        <label className="form-label">
                          <i className="bi bi-chat-left-text me-2"></i>
                          Interação 03
                        </label>
                        <small className="text-muted d-block">Mensagem opcional para terceira interação</small>
                      </div>
                      <FormField
                        name="interacao3"
                        type="textarea"
                        label=""
                        placeholder="Digite a terceira mensagem de interação..."
                        rows={3}
                        size="sm"
                        value={interacao3}
                        onChange={(value) => onInteracao3Change(String(value ?? ''))}
                      />
                    </div>
                  </div>

                  {/* Container de Variáveis - Apenas para Evolution API */}
                  {variaveisData && (
                <div className="row g-0 mt-3">
                  <div className="col-12">
                    <div className="card border-primary">
                      <div className="card-header py-2 px-3 bg-primary bg-opacity-10">
                        <h6 className="mb-0 d-flex align-items-center">
                          <i className="bi bi-code-square me-2"></i>
                          Variáveis Disponíveis para Mensagens
                        </h6>
                        <small className="text-muted d-block mt-1">
                          Clique nas variáveis para inserir na mensagem
                        </small>
                      </div>
                      <div className="card-body p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <div className="row g-0">
                          {Object.entries(variaveisData).map(([chave, grupo], index, array) => {
                            const isLastInRow = (index + 1) % 3 === 0;
                            const isLastItem = index === array.length - 1;
                            const showBorder = !isLastInRow && !isLastItem;
                            
                            return (
                            <div 
                              key={chave} 
                              className="col-md-6 col-lg-4"
                              style={{
                                borderRight: showBorder ? '1px solid var(--border-color)' : 'none',
                                paddingRight: showBorder ? '1rem' : '0'
                              }}
                            >
                              <h6 className="fw-bold mb-2 text-primary">
                                <i className="bi bi-tag me-1"></i>
                                {grupo.titulo}
                              </h6>
                              <div className="d-flex flex-column gap-2">
                                {grupo.variaveis.map((variavel) => (
                                  <div key={variavel.variavel} className="d-flex align-items-center gap-2">
                                    <span
                                      className="badge bg-info text-dark"
                                      style={{ 
                                        cursor: 'pointer', 
                                        fontSize: '0.75rem', 
                                        padding: '0.35rem 0.65rem',
                                        transition: 'all 0.2s ease'
                                      }}
                                      onClick={() => handleVariableClick(variavel.variavel)}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.backgroundColor = '#0dcaf0';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.backgroundColor = '';
                                      }}
                                      title={`${variavel.descricao}. Clique para inserir.`}
                                    >
                                      {variavel.variavel}
                                    </span>
                                    <small className="text-muted">{variavel.descricao}</small>
                                    {onCopyVariable && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-link p-0 text-muted ms-auto"
                                        onClick={() => onCopyVariable(variavel.variavel)}
                                        title="Copiar variável"
                                        style={{ fontSize: '0.75rem' }}
                                      >
                                        <i className="bi bi-clipboard"></i>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            );
                          })}
                        </div>
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
      </div>
    </div>
  );
};

export default MensagensTab;
