import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
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
  
  // Remover blob URLs inválidos do conteúdo
  const cleanBlobUrls = (html: string): string => {
    if (!html) return html;
    // Remover imagens com blob URLs inválidos
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
          height: height,
          menubar: false,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'wordcount'
          ],
          toolbar_mode: 'wrap',
          toolbar: 'undo redo | blocks | fontfamily fontsize | ' +
            'bold italic underline | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | link image table | variables | code',
          font_family_formats: 'Arial=arial,helvetica,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Tahoma=tahoma,arial,helvetica,sans-serif; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva',
          font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt 60pt 72pt',
          placeholder: safePlaceholder,
          content_style: `
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              font-size: 14px;
              line-height: 1.4;
            }
            .line-height-1 { line-height: 1.0 !important; }
            .line-height-115 { line-height: 1.15 !important; }
            .line-height-12 { line-height: 1.2 !important; }
            .line-height-15 { line-height: 1.5 !important; }
            .line-height-2 { line-height: 2.0 !important; }
          `,
          setup: (editor) => {
            // Aplicar estilo de fonte
            const applyFontFamily = (fontFamily: string) => {
              editor.dom.setStyle(editor.selection.getNode(), 'font-family', fontFamily);
            };

            // Aplicar tamanho de fonte
            const applyFontSize = (fontSize: string) => {
              editor.dom.setStyle(editor.selection.getNode(), 'font-size', fontSize);
            };

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

            // Botão de fonte com dropdown
            editor.ui.registry.addMenuButton('fontfamily', {
              text: 'Fonte',
              tooltip: 'Fonte',
              fetch: (callback) => {
                const fonts = [
                  { name: 'Arial', value: 'arial,helvetica,sans-serif' },
                  { name: 'Courier New', value: 'courier new,courier' },
                  { name: 'Georgia', value: 'georgia,palatino' },
                  { name: 'Helvetica', value: 'helvetica' },
                  { name: 'Impact', value: 'impact,chicago' },
                  { name: 'Tahoma', value: 'tahoma,arial,helvetica,sans-serif' },
                  { name: 'Times New Roman', value: 'times new roman,times' },
                  { name: 'Trebuchet MS', value: 'trebuchet ms,geneva' },
                  { name: 'Verdana', value: 'verdana,geneva' }
                ];
                const items = fonts.map(font => ({
                  type: 'menuitem' as const,
                  text: font.name,
                  onAction: () => applyFontFamily(font.value)
                }));
                callback(items);
              }
            });

            // Botão de tamanho com dropdown
            editor.ui.registry.addMenuButton('fontsize', {
              text: 'Tamanho',
              tooltip: 'Tamanho da Fonte',
              fetch: (callback) => {
                const sizes = ['8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '32pt', '36pt', '48pt', '60pt', '72pt'];
                const items = sizes.map(size => ({
                  type: 'menuitem' as const,
                  text: size,
                  onAction: () => applyFontSize(size)
                }));
                callback(items);
              }
            });

            editor.on('init', () => {
              const style = document.createElement('style');
              style.id = 'tinymce-print-styles';
              style.textContent = `
                @media print {
                  @page {
                    margin: 2cm 1.5cm 3cm 1.5cm;
                  }
                  img {
                    max-width: 100% !important;
                    height: auto !important;
                    page-break-inside: avoid !important;
                  }
                }
              `;
              document.head.appendChild(style);
            });
            
          },
          images_upload_handler: async (blobInfo) => {
            const { getAuthToken } = await import('../../services/core');
            
            const formData = new FormData();
            formData.append('image', blobInfo.blob(), blobInfo.filename());
            
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const response = await fetch(`${origin}/api/modelos-documento/upload-imagem`, {
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
            
            return data.url;
          },
          image_advtab: true,
          image_caption: true,
          allow_unsafe_link_target: true,
          convert_urls: false,
          relative_urls: false,
          remove_script_host: false,
          entity_encoding: 'raw',
          forced_root_block: 'p',
          forced_root_block_attrs: {},
          remove_trailing_brs: false,
          indent: true,
          indent_use_margin: false,
          indent_before: 'p,div,h1,h2,h3,h4,h5,h6,blockquote,ul,ol,li,table',
          indent_after: 'p,div,h1,h2,h3,h4,h5,h6,blockquote,ul,ol,li,table',
          branding: false,
          promotion: false
        }}
      />
    </div>
  );
};

const RichTextEditor = forwardRef(RichTextEditorInner);

export { RichTextEditor, type RichTextEditorProps, type RichTextEditorRef };
RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
