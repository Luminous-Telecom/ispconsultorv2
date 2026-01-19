import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { HotsiteService, type HotsiteVariable } from '@/services/hotsiteService';

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

const HotsiteModal: React.FC<HotsiteModalProps> = ({ show, onClose }) => {
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

  const handleClose = () => {
    setActiveTab('editar');
    setHtml('');
    onClose();
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync(html);
  };

  const insertVariable = (key: string) => {
    const placeholder = `{{${key}}}`;
    // Insere no final do conteúdo atual
    setHtml((prev) => `${prev}${placeholder}`);
  };

  const previewHtml = useMemo(() => {
    return html ? sanitizeSrcDocHtml(html) : '<div style="font-family: Arial; padding: 16px;">Nenhum HTML configurado.</div>';
  }, [html]);

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Hotsite"
      size="xl"
      modalId="hotsite-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
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
      }
    >
      <div className="p-2">
        <div className="card mb-2">
          <div className="card-header py-1 px-2">
            <small className="fw-bold mb-0">Conteúdo</small>
          </div>
          <div className="card-body p-2">
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '120px' }}>
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
              </div>
            ) : (
              <>
                <ul className="nav nav-tabs mb-2">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'editar' ? 'active' : ''}`}
                      onClick={() => setActiveTab('editar')}
                    >
                      Editar
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === 'visualizar' ? 'active' : ''}`}
                      onClick={() => setActiveTab('visualizar')}
                    >
                      Visualizar
                    </button>
                  </li>
                </ul>

                {activeTab === 'editar' ? (
                  <div className="row g-2">
                    <div className="col-12 col-lg-8">
                      <div style={{ height: '60vh', overflow: 'hidden' }}>
                        <CodeMirror
                          value={html}
                          height="55vh"
                          extensions={[htmlLang()]}
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
                        <div className="card-header py-1 px-2">
                          <small className="fw-bold mb-0">Variáveis</small>
                        </div>
                        <div className="card-body p-2" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
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
                ) : (
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
        <div className="text-muted small">O hotsite público é carregado a partir da tabela de hotsite.</div>
      </div>
    </DraggableModal>
  );
};

export default HotsiteModal;
