import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useTheme } from '@/contexts/ThemeContext';
import { HotsiteService, type HotsiteVariable } from '@/services/hotsiteService';
import { DadosEmpresaService, type DadosEmpresa } from '@/services/dadosEmpresaService';

interface HotsiteModalProps {
  show: boolean;
  onClose: () => void;
}

function sanitizeSrcDocHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  try {
    // Remove APENAS as meta tags que causam erros no console.
    // Scripts e handlers são mantidos para o hotsite funcionar normalmente.
    let sanitized = rawHtml;

    // Remove meta tags com X-Frame-Options (não funcionam em iframes)
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']x-frame-options["'][^>]*>/gi, '');
    
    // Remove meta tags com Content-Security-Policy que contenham frame-ancestors (não funcionam em iframes)
    sanitized = sanitized.replace(/<meta[^>]*http-equiv\s*=\s*["']content-security-policy["'][^>]*frame-ancestors[^>]*>/gi, '');
    sanitized = sanitized.replace(/<meta[^>]*name\s*=\s*["']content-security-policy["'][^>]*frame-ancestors[^>]*>/gi, '');

    return sanitized;
  } catch {
    return rawHtml;
  }
}

function buildVariablesMap(empresa: Partial<DadosEmpresa> | null, baseUrl: string): Record<string, string> {
  const razaoSocial = empresa?.razao_social || '';
  const nomeFantasia = empresa?.nome_fantasia || '';
  const cnpj = empresa?.cnpj || '';
  const inscricaoEstadual = empresa?.inscricao_estadual || '';
  const inscricaoMunicipal = empresa?.inscricao_municipal || '';
  const cep = empresa?.cep || '';
  const endereco = empresa?.endereco || '';
  const numero = empresa?.numero || '';
  const complemento = empresa?.complemento || '';
  const bairro = empresa?.bairro || '';
  const cidade = empresa?.cidade || '';
  const estado = empresa?.estado || '';
  const telefone = empresa?.telefone || '';
  const celular = empresa?.celular || '';
  const email = empresa?.email || '';
  const site = empresa?.site || '';
  const anoAtual = String(new Date().getFullYear());

  const partsEndereco = [
    endereco,
    numero ? `nº ${numero}` : '',
    complemento,
    bairro,
    cidade && estado ? `${cidade}/${estado}` : cidade || estado,
    cep ? `CEP ${cep}` : ''
  ].filter(Boolean);
  const enderecoCompleto = partsEndereco.join(', ');

  return {
    'empresa.razao_social': razaoSocial,
    'empresa.nome_fantasia': nomeFantasia,
    'empresa.cnpj': cnpj,
    'empresa.inscricao_estadual': inscricaoEstadual,
    'empresa.inscricao_municipal': inscricaoMunicipal,
    'empresa.cep': cep,
    'empresa.endereco': endereco,
    'empresa.numero': numero,
    'empresa.complemento': complemento,
    'empresa.bairro': bairro,
    'empresa.cidade': cidade,
    'empresa.estado': estado,
    'empresa.telefone': telefone,
    'empresa.celular': celular,
    'empresa.email': email,
    'empresa.site': site,
    'empresa.endereco_completo': enderecoCompleto,
    'empresa.logo_url': `${baseUrl}/api/dados-empresa/logo`,
    'sistema.ano_atual': anoAtual,
    'sistema.base_url': baseUrl
  };
}

function renderTemplate(html: string, variables: Record<string, string>): string {
  if (!html) return '';

  return html.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match: string, key: string) => {
    const value = variables[key];
    return value !== undefined ? value : '';
  });
}

const HotsiteModal: React.FC<HotsiteModalProps> = ({ show, onClose }) => {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  const [activeTab, setActiveTab] = useState<'editar' | 'visualizar'>('editar');
  const [html, setHtml] = useState<string>('');

  const { data: hotsiteResponse, isLoading } = useQuery({
    queryKey: ['hotsite-admin'],
    queryFn: () => HotsiteService.getAdmin(),
    enabled: show,
    staleTime: 0,
    refetchOnMount: true
  });

  const { data: variablesResponse } = useQuery({
    queryKey: ['hotsite-variaveis'],
    queryFn: () => HotsiteService.getVariables(),
    enabled: show,
    staleTime: 5 * 60 * 1000
  });

  const { data: empresaData } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    enabled: show,
    staleTime: 0,
    refetchOnMount: true
  });

  const variables = useMemo<HotsiteVariable[]>(() => {
    return variablesResponse?.data ?? [];
  }, [variablesResponse?.data]);

  const loadedHtml = useMemo(() => {
    const valor = hotsiteResponse?.data?.html;
    return typeof valor === 'string' ? valor : '';
  }, [hotsiteResponse?.data?.html]);

  useEffect(() => {
    if (!show) {
      setActiveTab('editar');
      setHtml('');
      return;
    }
    setHtml(loadedHtml);
  }, [show, loadedHtml]);

  const saveMutation = useMutation({
    mutationFn: async (conteudo: string) => {
      return HotsiteService.update(conteudo);
    },
    onSuccess: () => {
      success('Hotsite atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['hotsite-public'] });
    },
    onError: (err: unknown) => {
      const axiosError = err as AxiosError<{ message?: string }>;
      error(axiosError?.response?.data?.message || 'Erro ao atualizar hotsite');
    }
  });

  const handleClose = useCallback(() => {
    setActiveTab('editar');
    setHtml('');
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    await saveMutation.mutateAsync(html);
  }, [html, saveMutation]);

  const insertVariable = (key: string) => {
    const placeholder = `{{${key}}}`;
    // Insere no final do conteúdo atual
    setHtml((prev) => `${prev}${placeholder}`);
  };

  const previewHtml = useMemo(() => {
    if (!html) {
      return '<div style="font-family: Arial; padding: 16px;">Nenhum HTML configurado.</div>';
    }

    // Se estiver na aba "visualizar", substituir variáveis
    if (activeTab === 'visualizar' && empresaData) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const variables = buildVariablesMap(empresaData, baseUrl);
      const htmlComVariaveis = renderTemplate(html, variables);
      return sanitizeSrcDocHtml(htmlComVariaveis);
    }

    // Se estiver na aba "editar", apenas sanitizar
    return sanitizeSrcDocHtml(html);
  }, [html, activeTab, empresaData]);

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Hotsite"
      size="xl"
      modalId="hotsite-modal"
      headerActions={
        <div className="hotsite-header-unified">
          {/* Botões à direita */}
          <div className="hotsite-header-buttons modal-header-actions">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              Salvar
            </Button>
          </div>

          {/* Abas na parte inferior do header */}
          <div className="hotsite-header-tabs">
            <ul
              className={`nav nav-tabs hotsite-tabs-unified ${isMobile ? 'hotsite-tabs-mobile' : ''}`}
              id="hotsiteTabs"
              role="tablist"
              style={{
                margin: 0,
                padding: 0,
                borderBottom: 'none',
                backgroundColor: 'transparent'
              }}
            >
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link modal-tab-hover ${activeTab === 'editar' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('editar')}
                >
                  Editar
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === 'visualizar' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveTab('visualizar')}
                >
                  Visualizar
                </button>
              </li>
            </ul>
          </div>
        </div>
      }
    >
      <div className="hotsite-modal-content">
        {/* Conteúdo das Abas */}
        <div
          className="tab-content hotsite-tab-content hotsite-tab-content-padded"
          id="hotsiteTabContent"
        >
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '120px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'editar' && (
                <div className="row g-3">
                  <div className="col-12 col-lg-8">
                    <div style={{ height: '60vh', overflow: 'hidden' }}>
                      <CodeMirror
                        value={html}
                        height="55vh"
                        extensions={[
                          htmlLang(),
                          ...(theme === 'dark' ? [oneDark] : [])
                        ]}
                        onChange={(value) => setHtml(value)}
                        placeholder="Cole ou edite o HTML completo aqui (incluindo <head>, <style> e <script>). Use variáveis como {{empresa.razao_social}}."
                        basicSetup={{
                          lineNumbers: true,
                          highlightActiveLineGutter: true,
                          highlightSpecialChars: true,
                          foldGutter: true,
                          drawSelection: true,
                          dropCursor: true,
                          allowMultipleSelections: true,
                          indentOnInput: true,
                          bracketMatching: true,
                          closeBrackets: true,
                          autocompletion: true,
                          rectangularSelection: true,
                          crosshairCursor: true,
                          highlightActiveLine: true,
                          highlightSelectionMatches: true,
                          closeBracketsKeymap: true,
                          searchKeymap: true,
                          foldKeymap: true,
                          completionKeymap: true,
                          lintKeymap: true,
                        }}
                        style={{
                          fontSize: '13px',
                          border: '1px solid var(--bs-border-color)',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="card">
                      <div className="card-header py-2 px-3">
                        <h6 className="mb-0">Variáveis Disponíveis</h6>
                      </div>
                      <div className="card-body p-3" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                        {variables.length === 0 ? (
                          <div className="text-muted small">Nenhuma variável disponível.</div>
                        ) : (
                          <div className="d-grid gap-2">
                            {variables.map((v) => (
                              <button
                                key={v.key}
                                type="button"
                                className="btn btn-outline-secondary btn-sm text-start"
                                onClick={() => insertVariable(v.key)}
                              >
                                <div className="fw-bold">{`{{${v.key}}}`}</div>
                                <div className="text-muted small">{v.descricao}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-muted small mt-2">
                      Clique para inserir no editor.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visualizar' && (
                <div className="ratio ratio-16x9" style={{ minHeight: '60vh' }}>
                  <iframe
                    title="Pré-visualização do hotsite"
                    srcDoc={previewHtml}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
                    style={{ border: 0, background: '#fff' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DraggableModal>
  );
};

export default HotsiteModal;
