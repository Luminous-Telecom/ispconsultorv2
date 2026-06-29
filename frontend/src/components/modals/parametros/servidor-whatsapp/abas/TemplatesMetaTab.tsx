import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { defaultApiClient } from 'services/core';
import { TemplateWhatsAppService, type TemplateWhatsApp } from 'services/templateWhatsAppService';
import type { ApiResponse } from 'types';
import { Loading, RecarregarButton, SystemButton } from 'components/ui';

interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  suggested_template_mapping?: {
    name: string;
    language: string;
    variables: string[];
    header_document?: boolean;
  };
  components?: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{
      type: string;
      text: string;
      url?: string;
    }>;
  }>;
}

interface TemplatesResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    aprovados: number;
    templates: Template[];
  };
}

export interface TemplatesMetaTabProps {
  /** Habilita a query de templates */
  enabled?: boolean;
  mensagemType?: string;
  onSalvarVincular?: (data: { template_id: number }) => Promise<void>;
  onClose?: () => void;
}

const VARIAVEIS_DISPONIVEIS: { value: string; label: string }[] = [
  { value: 'cliente.razao_social', label: 'Razão Social' },
  { value: 'cliente.nome_fantasia', label: 'Nome Fantasia' },
  { value: 'titulo.valor', label: 'Valor' },
  { value: 'titulo.valor_final', label: 'Valor Final' },
  { value: 'titulo.valor_pago', label: 'Valor Pago' },
  { value: 'titulo.valor_currency', label: 'Valor (moeda)' },
  { value: 'titulo.valor_final_currency', label: 'Valor Final (moeda)' },
  { value: 'titulo.data_vencimento', label: 'Data Vencimento' },
  { value: 'titulo.pagamento', label: 'Data Pagamento' },
  { value: 'titulo.numero_titulo', label: 'Número do Título' },
  { value: 'dias_vencimento', label: 'Dias para Vencimento' }
];

function previewComVariaveis(textoMeta: string, variaveis: string[]): string {
  let result = textoMeta;
  for (let i = variaveis.length - 1; i >= 0; i--) {
    if (!variaveis[i]) continue;
    const placeholder = `{{${i + 1}}}`;
    result = result.split(placeholder).join(`{{${variaveis[i]}}}`);
  }
  return result;
}

const TemplatesMetaTab: React.FC<TemplatesMetaTabProps> = ({
  enabled = true,
  mensagemType,
  onSalvarVincular,
  onClose
}) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const expandedCardRef = React.useRef<HTMLDivElement>(null);
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const [variaveisSelecionadas, setVariaveisSelecionadas] = React.useState<Record<string, string[]>>({});

  const adjustTextareaHeight = React.useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const { data: templatesConfigurados } = useQuery<ApiResponse<TemplateWhatsApp[]>>({
    queryKey: ['templates-whatsapp'],
    queryFn: () => TemplateWhatsAppService.list(),
    enabled: true,
  });

  const { data, isLoading, error, refetch } = useQuery<TemplatesResponse['data']>({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const response = await defaultApiClient.get<TemplatesResponse>('/servidores-whatsapp/templates');
      if (!response.success) {
        throw new Error(response.message || CONTEXT_ERROR_MESSAGES.TEMPLATE_LOAD_ERROR);
      }
      if (response.data && 'total' in response.data && 'aprovados' in response.data && 'templates' in response.data) {
        return response.data as TemplatesResponse['data'];
      }
      return { total: 0, aprovados: 0, templates: [] };
    },
    enabled,
    retry: false
  });

  const createTemplateMutation = useMutation({
    mutationFn: (params: { template: Template; key: string }) => {
      const mapping = buildTemplateMapping(params.template, params.key);
      return TemplateWhatsAppService.create({
        nome: mapping.name,
        idioma: mapping.language,
        variables: mapping.variables,
        header_document: mapping.header_document,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        success('Template criado com sucesso');
        queryClient.invalidateQueries({ queryKey: ['templates-whatsapp'] });
      } else {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.TEMPLATE_CREATE_ERROR);
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TEMPLATE_CREATE_ERROR),
  });

  const handleCriarTemplate = async (template: Template, key: string) => {
    const nome = template.name;
    const idioma = template.language || 'pt_BR';
    const lista: TemplateWhatsApp[] = templatesConfigurados?.data ?? [];
    const jaExiste = lista.some(
      (t: TemplateWhatsApp) => t.nome === nome && (t.idioma || 'pt_BR') === idioma
    );
    if (jaExiste) {
      showApiError(`Já existe um template com o nome "${nome}" e idioma "${idioma}"`);
      return;
    }
    await createTemplateMutation.mutateAsync({ template, key });
  };

  React.useEffect(() => {
    if (!expandedCardRef.current || !expandedKey) return;
    const textareas = expandedCardRef.current.querySelectorAll('textarea');
    textareas.forEach((textarea) => adjustTextareaHeight(textarea));
  }, [expandedKey, data, variaveisSelecionadas, adjustTextareaHeight]);

  const getVarsParaTemplate = (template: Template, key: string): string[] => {
    const selecionadas = variaveisSelecionadas[key];
    if (selecionadas && selecionadas.length > 0) return selecionadas;
    return template.suggested_template_mapping?.variables ?? (
      mensagemType === 'recibo_pagamento'
        ? ['titulo.valor_pago', 'titulo.pagamento']
        : ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento']
    );
  };

  const buildTemplateMapping = (template: Template, key: string) => {
    const vars = (variaveisSelecionadas[key]?.filter(Boolean).length ? variaveisSelecionadas[key].filter(Boolean) : undefined)
      ?? template.suggested_template_mapping?.variables
      ?? (mensagemType === 'recibo_pagamento' ? ['titulo.valor_pago', 'titulo.pagamento'] : ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento']);
    return {
      name: template.name,
      language: template.language,
      variables: vars,
      header_document: template.suggested_template_mapping?.header_document
    };
  };

  const handleSalvarVincular = async (template: Template, key: string) => {
    if (!mensagemType || !onSalvarVincular) return;
    const mapping = buildTemplateMapping(template, key);
    const res = await TemplateWhatsAppService.create({
      nome: mapping.name,
      idioma: mapping.language,
      variables: mapping.variables,
      header_document: mapping.header_document,
    });
    if (!res.success || !res.data?.id) {
      throw new Error(res.message || CONTEXT_ERROR_MESSAGES.TEMPLATE_CREATE_ERROR);
    }
    await onSalvarVincular({ template_id: res.data.id });
    onClose?.();
  };

  const setVarParaPlaceholder = (templateKey: string, placeholderIndex: number, varValue: string, varsAtuais: string[]) => {
    setVariaveisSelecionadas((prev) => {
      const base = (prev[templateKey]?.length ? prev[templateKey] : varsAtuais) ?? [];
      const nova = [...base];
      nova[placeholderIndex] = varValue;
      return { ...prev, [templateKey]: nova };
    });
  };

  return (
    <div style={{ padding: isMobile ? '0' : '16px' }}>
      <div className="d-flex gap-2 mb-3">
        <RecarregarButton type="button" onClick={() => refetch()} isPending={isLoading} />
      </div>

      {isLoading && (
        <Loading variant="modal" message="Carregando templates..." />
      )}

      {error && (
        <div className="alert alert-danger">
          Erro ao buscar templates: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </div>
      )}

      {data && (
        <>
          <div className="mb-3">
            <div className="d-flex gap-3">
              <div><strong>Total:</strong> {data.total || 0}</div>
              <div><strong>Aprovados:</strong> {data.aprovados || 0}</div>
            </div>
          </div>

          {!data.templates || data.templates.length === 0 ? (
            <div className="alert alert-info">
              Nenhum template aprovado encontrado.
            </div>
          ) : (
            <>
              <div className="row g-2 mb-3" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {data.templates.map((template: Template, index: number) => {
                  const key = `${template.name}-${template.language}-${index}`;
                  const isExpanded = expandedKey === key;
                  return (
                    <div key={key} className="col-6 col-md-4 col-lg-3">
                      <div
                        className={`card h-100 ${isExpanded ? 'border-primary' : ''}`}
                        style={{ cursor: 'pointer', minHeight: 90 }}
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        <div className="card-body d-flex flex-column align-items-center position-relative p-2">
                          <div className="mb-1 mt-1">
                            <i className="bi bi-chat-dots text-secondary" style={{ fontSize: '1.25rem' }}></i>
                          </div>
                          <div className="text-center flex-grow-1 small">
                            <div className="fw-bold text-break" style={{ fontSize: '0.75rem' }}>{template.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.65rem' }}>{template.language}</div>
                          </div>
                          <div className="mt-1">
                            <i className="bi bi-database text-success" style={{ fontSize: '0.9rem' }}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {expandedKey && (() => {
                const template = data.templates.find((t: Template, i: number) => `${t.name}-${t.language}-${i}` === expandedKey);
                if (!template) return null;
                const bodyComp = template.components?.find((c: NonNullable<Template['components']>[number]) => c.type === 'BODY');
                const textoMeta = (bodyComp as { text?: string })?.text || '';
                const numVars = (textoMeta.match(/\{\{\d+\}\}/g) || [])
                  .map((m) => parseInt(m.replace(/\{\{|\}\}/g, ''), 10))
                  .reduce((max, n) => Math.max(max, n), 0) || 1;
                const vars = getVarsParaTemplate(template, expandedKey);
                const varsCompletas = Array.from({ length: numVars }, (_, i) => vars[i] ?? '');
                const preview = previewComVariaveis(textoMeta, varsCompletas);
                return (
                  <div ref={expandedCardRef} className="card bg-light mb-0">
                    <div className="card-body small">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Mensagem</label>
                        <textarea
                          className="form-control form-control-sm font-monospace"
                          rows={1}
                          readOnly
                          value={textoMeta}
                          style={{ resize: 'none', minHeight: '2.5rem' }}
                        />
                        <small className="text-muted">Template da Meta (variáveis numeradas)</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-bold">Pré-visualização</label>
                        <textarea
                          className="form-control form-control-sm font-monospace"
                          rows={1}
                          readOnly
                          value={preview}
                          style={{ resize: 'none', minHeight: '2.5rem' }}
                        />
                        <small className="text-muted">Mensagem com as variáveis selecionadas</small>
                      </div>
                      <div>
                        <label className="form-label fw-bold">Variáveis (mesmas para todos os templates)</label>
                        <div className="row g-2">
                          {Array.from({ length: numVars }, (_, i) => (
                            <div key={i} className="col-12 col-md-6 col-lg-4">
                              <label className="form-label small mb-0">{`{{${i + 1}}}`}</label>
                              <select
                                className="form-select form-select-sm"
                                value={varsCompletas[i] ?? ''}
                                onChange={(e) => setVarParaPlaceholder(expandedKey, i, e.target.value, varsCompletas)}
                              >
                                <option value="">Selecione...</option>
                                {VARIAVEIS_DISPONIVEIS.map((v) => (
                                  <option key={v.value} value={v.value}>
                                    {v.label} ({v.value})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-top">
                        {mensagemType && onSalvarVincular ? (
                          <SystemButton
                            action="salvar"
                            type="button"
                            label={`Salvar e vincular ao tipo "${mensagemType.replace(/_/g, ' ')}"`}
                            onClick={() => handleSalvarVincular(template, expandedKey)}
                          />
                        ) : (
                          <SystemButton
                            action="novo"
                            type="button"
                            label="Criar template"
                            onClick={() => handleCriarTemplate(template, expandedKey)}
                            disabled={createTemplateMutation.isPending}
                            isPending={createTemplateMutation.isPending}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TemplatesMetaTab;
