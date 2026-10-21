import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { defaultApiClient } from 'services/core';
import { TemplateWhatsAppService, type TemplateWhatsApp } from 'services/templateWhatsAppService';
import type { ApiResponse } from 'types';
import { Badge, FormField, Loading, RecarregarButton, SystemButton } from 'components/ui';
import type { BadgeVariant } from 'components/ui';

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
    header_format?: string | null;
    button_types?: string[];
    template_structure?: {
      bodyParamCount: number;
      headerFormat?: string | null;
      buttons: Array<{ type: string; index: number; requiresParameter: boolean }>;
    };
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
  servidorWhatsappId?: number | null;
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

function getTemplateBodyText(template: Template): string {
  const bodyComp = template.components?.find((c) => c.type === 'BODY');
  return (bodyComp as { text?: string } | undefined)?.text || '';
}

function getTemplateStatusVariant(status: string): BadgeVariant {
  const normalized = status.toLowerCase();
  if (normalized.includes('approved') || normalized.includes('aprovado')) return 'success';
  if (normalized.includes('rejected') || normalized.includes('rejeitado')) return 'danger';
  if (normalized.includes('pending') || normalized.includes('pendente')) return 'warning';
  return 'secondary';
}

function formatButtonTypeLabel(type: string): string {
  const map: Record<string, string> = {
    URL: 'Link URL',
    ORDER_DETAILS: 'PIX / Pedido',
    COPY_CODE: 'Copiar código',
    QUICK_REPLY: 'Resposta rápida',
    PHONE_NUMBER: 'Telefone',
    FLOW: 'Flow',
    CATALOG: 'Catálogo',
    MPM: 'Multi-produto',
  };
  return map[type] || type;
}

function getTemplateStructureSummary(template: Template): string {
  const mapping = template.suggested_template_mapping;
  if (!mapping) return 'Mensagem de texto';
  const parts: string[] = [];
  if (mapping.header_format) {
    parts.push(`Header: ${mapping.header_format}`);
  } else if (mapping.header_document) {
    parts.push('PDF no cabeçalho');
  }
  if (mapping.button_types?.length) {
    parts.push(`Botões: ${mapping.button_types.map(formatButtonTypeLabel).join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Mensagem de texto';
}

function formatTemplateStatus(status: string): string {
  if (!status) return 'Sem status';
  return status.replace(/_/g, ' ').toLowerCase();
}

const TemplatesMetaTab: React.FC<TemplatesMetaTabProps> = ({
  enabled = true,
  servidorWhatsappId,
  mensagemType,
  onSalvarVincular,
  onClose
}) => {
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
    queryKey: ['templates-whatsapp', servidorWhatsappId],
    queryFn: () => TemplateWhatsAppService.list(servidorWhatsappId),
    enabled: !!servidorWhatsappId,
  });

  const { data, isLoading, error, refetch } = useQuery<TemplatesResponse['data']>({
    queryKey: ['whatsapp-templates', servidorWhatsappId],
    queryFn: async () => {
      const query = servidorWhatsappId ? `?servidor_id=${servidorWhatsappId}` : '';
      const response = await defaultApiClient.get<TemplatesResponse>(`/servidores-whatsapp/templates${query}`);
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
        servidor_whatsapp_id: servidorWhatsappId,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        success('Template salvo com sucesso');
        queryClient.invalidateQueries({ queryKey: ['templates-whatsapp'] });
      } else {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.TEMPLATE_CREATE_ERROR);
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TEMPLATE_CREATE_ERROR),
  });

  const handleSalvarTemplate = async (template: Template, key: string) => {
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
      servidor_whatsapp_id: servidorWhatsappId,
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
    <div className="modal-inner-padding">
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
          <div className="template-meta-summary mb-3">
            <div>
              <div className="template-meta-summary__label">Templates Meta</div>
              <div className="template-meta-summary__title">Modelos aprovados para WhatsApp Cloud</div>
            </div>
            <div className="template-meta-summary__stats">
              <Badge variant="primary" pill>Total: {data.total || 0}</Badge>
              <Badge variant="success" pill>Aprovados: {data.aprovados || 0}</Badge>
            </div>
          </div>

          {!data.templates || data.templates.length === 0 ? (
            <div className="alert alert-info">
              Nenhum template aprovado encontrado.
            </div>
          ) : (
            <>
              <div className="template-meta-grid mb-3 scroll-max-380">
                {data.templates.map((template: Template, index: number) => {
                  const key = `${template.name}-${template.language}-${index}`;
                  const isExpanded = expandedKey === key;
                  const textoMeta = getTemplateBodyText(template);
                  const placeholders = textoMeta.match(/\{\{\d+\}\}/g)?.length ?? 0;
                  return (
                    <div key={key}>
                      <div
                        className={`template-meta-card ${isExpanded ? 'template-meta-card--active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setExpandedKey(isExpanded ? null : key);
                          }
                        }}
                      >
                        <div className="template-meta-card__header">
                          <div className="template-meta-card__icon" aria-hidden>
                            <i className="bi bi-whatsapp" />
                          </div>
                          <div className="template-meta-card__identity">
                            <div className="template-meta-card__name">{template.name}</div>
                            <div className="template-meta-card__meta">{template.language || 'pt_BR'}</div>
                          </div>
                          <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} template-meta-card__chevron`} aria-hidden />
                        </div>
                        <div className="template-meta-card__badges">
                          <Badge variant={getTemplateStatusVariant(template.status)} pill>
                            {formatTemplateStatus(template.status)}
                          </Badge>
                          {template.category && (
                            <Badge variant="secondary" pill>{template.category.toLowerCase()}</Badge>
                          )}
                          <Badge variant="info" pill>{placeholders} variáveis</Badge>
                        </div>
                        <p className="template-meta-card__preview">
                          {textoMeta || 'Template sem corpo de mensagem retornado pela Meta.'}
                        </p>
                        <div className="template-meta-card__footer">
                          <span>Editar mapeamento</span>
                          <span>{getTemplateStructureSummary(template)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {expandedKey && (() => {
                const template = data.templates.find((t: Template, i: number) => `${t.name}-${t.language}-${i}` === expandedKey);
                if (!template) return null;
                const textoMeta = getTemplateBodyText(template);
                const numVars = (textoMeta.match(/\{\{\d+\}\}/g) || [])
                  .map((m) => parseInt(m.replace(/\{\{|\}\}/g, ''), 10))
                  .reduce((max, n) => Math.max(max, n), 0) || 1;
                const vars = getVarsParaTemplate(template, expandedKey);
                const varsCompletas = Array.from({ length: numVars }, (_, i) => vars[i] ?? '');
                const preview = previewComVariaveis(textoMeta, varsCompletas);
                return (
                  <div ref={expandedCardRef} className="template-meta-detail form-modal-simple">
                    <div className="template-meta-detail__header">
                      <div>
                        <div className="template-meta-detail__eyebrow">Mapeamento selecionado</div>
                        <div className="template-meta-detail__title">{template.name}</div>
                      </div>
                      <Badge variant={getTemplateStatusVariant(template.status)} pill>
                        {formatTemplateStatus(template.status)}
                      </Badge>
                    </div>
                    {template.suggested_template_mapping?.button_types?.length ? (
                      <div className="template-meta-detail__badges row g-2 mb-2 form-modal-input-col">
                        {template.suggested_template_mapping.button_types.map((btnType) => (
                          <div key={btnType} className="col-auto">
                            <Badge variant="info" pill>{formatButtonTypeLabel(btnType)}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="row g-2">
                      <div className="col-12">
                        <FormField
                          name="template_meta_mensagem"
                          type="textarea"
                          size="sm"
                          label="Mensagem"
                          rows={1}
                          readOnly
                          disabled
                          value={textoMeta}
                          helpText="Template da Meta (variáveis numeradas)"
                          className="font-monospace textarea-no-resize-sm"
                        />
                      </div>
                      <div className="col-12">
                        <FormField
                          name="template_meta_preview"
                          type="textarea"
                          size="sm"
                          label="Pré-visualização"
                          rows={1}
                          readOnly
                          disabled
                          value={preview}
                          helpText="Mensagem com as variáveis selecionadas"
                          className="font-monospace textarea-no-resize-sm"
                        />
                      </div>
                      <div className="col-12">
                        <div className="form-section-heading-row">
                          <span className="form-section-heading-pill">
                            Variáveis (mesmas para todos os templates)
                          </span>
                          <div className="form-section-heading-line" aria-hidden />
                        </div>
                            <div className="row g-2">
                              {Array.from({ length: numVars }, (_, i) => (
                                <div key={i} className="col-12">
                                  <FormField
                                    name={`template_var_${i + 1}`}
                                    type="select"
                                    size="sm"
                                    label={`{{${i + 1}}}`}
                                    value={varsCompletas[i] ?? ''}
                                    options={[
                                      { value: '', label: 'Selecione...' },
                                      ...VARIAVEIS_DISPONIVEIS.map((v) => ({
                                        value: v.value,
                                        label: `${v.label} (${v.value})`,
                                      })),
                                    ]}
                                    onChange={(value) =>
                                      setVarParaPlaceholder(expandedKey, i, String(value ?? ''), varsCompletas)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                      </div>
                    </div>
                    <div className="template-meta-detail__actions form-modal-input-col">
                      {mensagemType && onSalvarVincular ? (
                        <SystemButton
                          action="salvar"
                          type="button"
                          label={`Salvar e vincular ao tipo "${mensagemType.replace(/_/g, ' ')}"`}
                          onClick={() => handleSalvarVincular(template, expandedKey)}
                        />
                      ) : (
                        <SystemButton
                          action="salvar"
                          type="button"
                          label="Salvar template"
                          onClick={() => handleSalvarTemplate(template, expandedKey)}
                          disabled={createTemplateMutation.isPending}
                          isPending={createTemplateMutation.isPending}
                        />
                      )}
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
