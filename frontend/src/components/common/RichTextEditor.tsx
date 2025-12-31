import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
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
import 'tinymce/plugins/preview';
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
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'preview',
            'searchreplace', 'code', 'fullscreen',
            'table', 'wordcount'
          ],
          toolbar: 'undo redo | fontfamily fontsize | ' +
            'bold italic underline forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | ' +
            'link image table | ' +
            'searchreplace code preview fullscreen | ' +
            'removeformat | variables',
          // Garantir que larguras de tabela personalizadas sejam mantidas
          table_style_by_css: true,
          table_default_styles: {
            width: 'auto'
          },
          font_size_formats: '8pt 10pt 12pt 14pt 18pt 24pt 36pt',
          font_family_formats: 'Arial=arial,helvetica,sans-serif;'
            + 'Helvetica=helvetica,arial,sans-serif;'
            + 'Times New Roman=times new roman,times;'
            + 'Georgia=georgia,serif;'
            + 'Courier New=courier new,courier,monospace',
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
              
              throw new Error(response.message || 'Não foi possível carregar variáveis');
            };

            // Botão de variáveis
            editor.ui.registry.addMenuButton('variables', {
              text: 'Variáveis',
              tooltip: 'Inserir Variáveis',
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
                      text: 'Erro ao carregar variáveis',
                      onAction: () => {
                        editor.notificationManager.open({
                          text: error instanceof Error ? error.message : 'Erro desconhecido',
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
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Erro ao fazer upload: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.url) {
              throw new Error(data.message || 'URL da imagem não retornada pelo servidor');
            }
            
            const imageUrl = data.url.startsWith('/') 
              ? `${window.location.origin}${data.url}`
              : data.url;
            
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
