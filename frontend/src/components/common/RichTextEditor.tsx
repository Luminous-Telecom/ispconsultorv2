import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useI18n } from '../../contexts/I18nContext';
import 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/image';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce-i18n/langs/pt_BR';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  id?: string;
  name?: string;
  ariaLabelledBy?: string;
}

interface RichTextEditorRef {
  insertVariable: (variable: string) => void;
}

const RichTextEditorInner: React.ForwardRefRenderFunction<RichTextEditorRef, RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px',
  id,
  name: _name,
  ariaLabelledBy
}, ref) => {
  const { t } = useI18n();
  const editorRef = useRef<TinyMCEEditor | null>(null);
  
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };
  
  // Remover apenas blob URLs inválidos (não converter URLs absolutas válidas)
  const cleanBlobUrls = (html: string): string => {
    if (!html) return html;
    // Remover apenas imagens com blob URLs inválidos
    // Não converter URLs absolutas - elas são necessárias para o PDF
    return html.replace(/<img[^>]*src=["']blob:[^"']*["'][^>]*>/gi, '');
  };
  
  const safeValue = value ? cleanBlobUrls(decodeHtmlEntities(value)) : '';
  const safePlaceholder = placeholder || 'Digite aqui...';

  const insertVariable = (variable: string) => {
    editorRef.current?.insertContent(variable);
  };

  useImperativeHandle(ref, () => ({
    insertVariable
  }));

  return (
    <div className="tinymce-wrapper" style={{ height: '100%' }}>
      <Editor
        licenseKey="gpl"
        onInit={(evt, editor) => {
          editorRef.current = editor;
          if (id) {
            editor.getBody().id = id;
          }
          if (ariaLabelledBy) {
            editor.getBody().setAttribute('aria-labelledby', ariaLabelledBy);
          }
          editor.getBody().setAttribute('role', 'textbox');
          editor.getBody().setAttribute('aria-multiline', 'true');
        }}
        value={safeValue}
        onEditorChange={(content) => {
          onChange(typeof content === 'string' ? content : '');
        }}
        init={{
          language: 'pt_BR',
          height: height || 500,
          menubar: false,
          // Usa skins via CDN para evitar 404 e não poluir o CSS global do app
          skin_url: 'https://cdn.jsdelivr.net/npm/tinymce@7.9.1/skins/ui/oxide',
          content_css: 'https://cdn.jsdelivr.net/npm/tinymce@7.9.1/skins/content/default/content.css',
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image',
            'searchreplace', 'code',
            'table', 'wordcount'
          ],
          toolbar: 'undo redo | fontfamily fontsize variables | ' +
            'bold italic underline forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | ' +
            'link image table | ' +
            'searchreplace code | ' +
            'removeformat',
          // Garantir que larguras de tabela personalizadas sejam mantidas
          table_style_by_css: true,
          table_default_styles: {
            width: 'auto'
          },
          placeholder: safePlaceholder,
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
          entity_encoding: 'raw',
          setup: (editor) => {
            // Interface para variáveis
            interface Variavel {
              variavel: string;
              descricao: string;
            }

            interface CategoriaVariaveis {
              titulo: string;
              variaveis: Variavel[];
            }

            interface VariaveisData {
              [key: string]: CategoriaVariaveis;
            }

            // Buscar variáveis do backend
            const buscarVariaveis = async (): Promise<VariaveisData> => {
              const { defaultApiClient } = await import('../../services/core');
              const response = await defaultApiClient.get<VariaveisData>('/modelos-documento/variaveis');
              
              if (response.success && response.data) {
                return response.data;
              }
              
              throw new Error(response.message || t('variables.errorLoading'));
            };

            // Botão de variáveis
            editor.ui.registry.addMenuButton('variables', {
              text: t('user.variables') || 'Variáveis',
              tooltip: t('variables.insert'),
              onSetup: () => {
                const button = editor.editorContainer?.querySelector(`.tox-tbtn[aria-label="${t('user.variables') || 'Variáveis'}"]`) as HTMLElement | null;
                if (button) {
                  button.classList.add('tox-tbtn--select');
                }
                return () => {
                  if (button) {
                    button.classList.remove('tox-tbtn--select');
                  }
                };
              },
              fetch: async (callback) => {
                try {
                  const variaveisData = await buscarVariaveis();
                  const items: Array<{ type: 'menuitem' | 'separator'; text?: string; onAction?: () => void }> = [];

                  Object.entries(variaveisData).forEach(([_categoryKey, categoryData]) => {
                    if (categoryData?.variaveis?.length > 0) {
                      if (items.length > 0) {
                        items.push({ type: 'separator' });
                      }

                      categoryData.variaveis.forEach((variable) => {
                        if (variable?.variavel) {
                          const variavelValue = variable.variavel;
                          items.push({
                            type: 'menuitem',
                            text: `${variavelValue} - ${variable.descricao || ''}`,
                            onAction: () => editor.insertContent(variavelValue)
                          });
                        }
                      });
                    }
                  });

                  callback(items);
                } catch (error) {
                  callback([
                    {
                      type: 'menuitem',
                      text: t('variables.errorLoading'),
                      onAction: () => {
                        editor.notificationManager.open({
                          text: error instanceof Error ? error.message : t('messages.error'),
                          type: 'error'
                        });
                      }
                    }
                  ]);
                }
              }
            });

          },
          images_upload_handler: async (blobInfo) => {
            const { getAuthToken } = await import('../../services/core');
            
            const formData = new FormData();
            formData.append('image', blobInfo.blob(), blobInfo.filename());
            
            const response = await fetch('/api/modelos-documento/upload-imagem', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${getAuthToken() || ''}`
              },
              body: formData
            });
            
            // Ler como texto primeiro para poder logar e ainda parsear (evita consumo duplo do body)
            const rawText = await response.text();
            let data: unknown = null;
            try {
              data = rawText ? JSON.parse(rawText) : null;
            } catch {
              data = null;
            }

            // Logs de diagnóstico (apenas em dev)
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug('[RichTextEditor] upload imagem', {
                ok: response.ok,
                status: response.status,
                filename: blobInfo.filename(),
                response: data ?? rawText
              });
            }

            if (!response.ok) {
              const errorMessage =
                (data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
                  ? (data as { message: string }).message
                  : null) || `Erro ao fazer upload: ${response.status}`;
              throw new Error(errorMessage);
            }

            // Aceitar ambos formatos:
            // - { success: true, url: "..." }
            // - { success: true, data: { url: "..." } }
            const success =
              !!(data && typeof data === 'object' && 'success' in data && (data as { success?: unknown }).success === true);

            const urlFromTop =
              (data && typeof data === 'object' && 'url' in data && typeof (data as { url?: unknown }).url === 'string')
                ? (data as { url: string }).url
                : null;

            const urlFromData =
              (data && typeof data === 'object' && 'data' in data && (data as { data?: unknown }).data && typeof (data as { data: { url?: unknown } }).data === 'object'
                && 'url' in (data as { data: { url?: unknown } }).data
                && typeof (data as { data: { url?: unknown } }).data.url === 'string')
                ? (data as { data: { url: string } }).data.url
                : null;

            const returnedUrl = urlFromTop || urlFromData;

            if (!success || !returnedUrl) {
              const message =
                (data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
                  ? (data as { message: string }).message
                  : null) || 'URL da imagem não retornada pelo servidor';
              throw new Error(message);
            }

            const imageUrl = returnedUrl.startsWith('/')
              ? `${window.location.origin}${returnedUrl}`
              : returnedUrl;
            
            return imageUrl;
          }
        }}
      />
    </div>
  );
};

const RichTextEditor = forwardRef(RichTextEditorInner);

export { RichTextEditor, type RichTextEditorProps, type RichTextEditorRef };
RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
