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
  onInsertVariable?: (variable: string) => void;
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
  ariaLabelledBy,
  onInsertVariable
}, ref) => {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  
  // Decodificar entidades HTML antes de passar para o editor
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };
  
  // Formatar HTML com indentação adequada
  const formatHtml = (html: string): string => {
    if (!html || !html.trim()) return html;
    
    // Elementos de bloco que devem ter quebra de linha
    const blockElements = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'blockquote', 'pre', 'figure'];
    
    // Adicionar quebras de linha após tags de fechamento de elementos de bloco
    let formatted = html.replace(/(<\/(div|p|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|tfoot|blockquote|pre|figure|br)[^>]*>)/gi, '$1\n');
    
    // Adicionar quebras de linha antes de tags de abertura de elementos de bloco
    formatted = formatted.replace(/(<)(div|p|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|tfoot|blockquote|pre|figure)[^>]*(>)/gi, '\n$1$2$3');
    
    // Limpar múltiplas quebras de linha consecutivas (máximo 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Adicionar indentação básica
    const lines = formatted.split('\n');
    let indent = 0;
    const tab = '  ';
    const result: string[] = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        result.push('');
        return;
      }
      
      // Diminuir indentação antes de tags de fechamento
      if (trimmed.match(/^<\//)) {
        indent = Math.max(0, indent - 1);
      }
      
      result.push(tab.repeat(indent) + trimmed);
      
      // Aumentar indentação após tags de abertura (exceto self-closing)
      if (trimmed.match(/^<[^/!]/) && !trimmed.match(/\/>$/)) {
        const tagName = trimmed.match(/^<(\w+)/)?.[1]?.toLowerCase();
        if (tagName && blockElements.includes(tagName)) {
          indent++;
        }
      }
    });
    
    return result.join('\n').trim();
  };
  
  const safeValue = typeof value === 'string' ? decodeHtmlEntities(value) : '';
  const safePlaceholder = typeof placeholder === 'string' ? placeholder : 'Digite aqui...';

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(variable);
    }
    if (onInsertVariable) {
      onInsertVariable(variable);
    }
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
            // Função auxiliar para aplicar estilo de fonte
            const applyFontFamily = (fontFamily: string) => {
              editor.execCommand('mceToggleFormat', false, 'fontname');
              const selectedText = editor.selection.getContent();
              if (selectedText) {
                editor.execCommand('mceReplaceContent', false, `<span style="font-family: ${fontFamily}">${selectedText}</span>`);
              } else {
                editor.dom.setStyle(editor.selection.getNode(), 'font-family', fontFamily);
              }
            };

            // Função auxiliar para aplicar tamanho de fonte
            const applyFontSize = (fontSize: string) => {
              editor.execCommand('mceToggleFormat', false, 'fontsize');
              const selectedText = editor.selection.getContent();
              if (selectedText) {
                editor.execCommand('mceReplaceContent', false, `<span style="font-size: ${fontSize}">${selectedText}</span>`);
              } else {
                editor.dom.setStyle(editor.selection.getNode(), 'font-size', fontSize);
              }
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

            // Função para buscar variáveis do backend
            const buscarVariaveis = async (): Promise<VariaveisData> => {
              const { defaultApiClient } = await import('../../services/core');
              
              try {
                const response = await defaultApiClient.get<VariaveisData>('/modelos-documento/variaveis');
                
                if (response.success && response.data) {
                  return response.data;
                }
                
                throw new Error(response.message || 'Não foi possível carregar variáveis');
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar variáveis';
                throw new Error(errorMessage);
              }
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
                    if (categoryData && categoryData.variaveis && Array.isArray(categoryData.variaveis) && categoryData.variaveis.length > 0) {
                      // Adicionar separador antes de cada categoria (exceto a primeira)
                      if (items.length > 0) {
                        items.push({ type: 'separator' });
                      }

                      // Adicionar variáveis da categoria
                      categoryData.variaveis.forEach((variable) => {
                        if (variable && variable.variavel) {
                          const variavelValue = variable.variavel; // Capturar valor para evitar closure
                          items.push({
                            type: 'menuitem',
                            text: `${variavelValue} - ${variable.descricao || ''}`,
                            onAction: () => {
                              // Inserir conteúdo diretamente
                              editor.insertContent(variavelValue);
                              // Não chamar onInsertVariable aqui para evitar loop
                              // O onEditorChange já será disparado automaticamente
                            }
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
            
            // Interceptar quando o código fonte é aberto para formatar o HTML
            editor.on('ExecCommand', (e) => {
              if (e.command === 'mceCodeEditor') {
                setTimeout(() => {
                  try {
                    // Acessar a janela do editor de código usando a API correta
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const windowManager = editor.windowManager as { windows?: Array<{ getEl?: () => HTMLElement | null }> };
                    const codeWindow = windowManager.windows?.[0];
                    if (codeWindow) {
                      const el = codeWindow.getEl?.();
                      const iframe = el?.querySelector('iframe') as HTMLIFrameElement | null;
                      if (iframe && iframe.contentWindow) {
                        const textarea = iframe.contentWindow.document.querySelector('textarea') as HTMLTextAreaElement | null;
                        if (textarea) {
                          const currentContent = textarea.value;
                          const formatted = formatHtml(currentContent);
                          textarea.value = formatted;
                        }
                      }
                    }
                  } catch (error) {
                    // Ignorar erros de formatação
                  }
                }, 200);
              }
            });
          },
          images_upload_handler: async (blobInfo) => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blobInfo.blob());
            });
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
