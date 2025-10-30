import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor } from 'ckeditor5';
import { 
  Bold,
  Essentials,
  Italic,
  Paragraph,
  Undo,
  Heading,
  List,
  Link,
  Image,
  ImageUpload,
  ImageResize,
  ImageInsert,
  Alignment,
  Font,
  FontColor,
  FontBackgroundColor,
  RemoveFormat,
  SourceEditing,
  GeneralHtmlSupport,
  Underline,
  BlockQuote,
  Code,
  HorizontalLine,
  Indent,
  IndentBlock,
  FontSize,
  FontFamily,
  Base64UploadAdapter
} from 'ckeditor5';
import { 
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties
} from 'ckeditor5';
import VariablePlugin from './VariablePlugin';

import 'ckeditor5/ckeditor5.css';

// CSS para garantir que as fontes funcionem na impressão
const editorStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
  
  /* Estilos base para imagens */
  img {
    display: block;
    object-fit: contain;
    max-width: 100% !important;
  }
  
  /* Limitar imagens com atributos width/height muito grandes */
  img[width] {
    max-width: 100% !important;
    height: auto !important;
  }
  
  /* Se tem style inline com dimensões, preservar proporções */
  img[style*="width"] {
    max-width: 100% !important;
    height: auto !important;
  }
  
  /* Apenas aplicar max-width em imagens SEM dimensões inline */
  img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
    max-width: 100%;
    height: auto;
  }
  
  /* Controlar espaçamento entre elementos */
  p {
    margin: 0;
    padding: 0;
    line-height: 1.2;
  }
  
  /* Classes de espaçamento entre linhas */
  .line-height-1 { line-height: 1.0 !important; }
  .line-height-115 { line-height: 1.15 !important; }
  .line-height-12 { line-height: 1.2 !important; }
  .line-height-15 { line-height: 1.5 !important; }
  .line-height-2 { line-height: 2.0 !important; }
  
  p:empty {
    margin: 0;
    padding: 0;
    line-height: 0;
    height: 0;
    display: none;
  }
  
  br {
    display: block;
    margin: 0;
    padding: 0;
    line-height: 1;
    height: 0.5em;
  }
  
  /* Adicionar pequeno espaço apenas entre parágrafos consecutivos */
  p + p {
    margin-top: 0.2em;
  }
  
  /* Espaçamento entre tabelas */
  figure.table {
    margin-top: 0;
    margin-bottom: 0.5em;
  }
  
  figure.table + figure.table {
    margin-top: 0.5em;
  }
  
  /* Remover espaço entre parágrafos vazios e tabelas */
  p:empty + figure.table,
  figure.table + p:empty {
    margin: 0;
  }
  
  /* Garante que as fontes inline sejam respeitadas na impressão em TODO o documento */
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Numeração de páginas */
    @page {
      margin: 2cm 1.5cm 3cm 1.5cm;
    }
    
    /* Adicionar numeração via CSS */
    body {
      counter-reset: page;
    }
    
    body::after {
      content: "Página " counter(page) " de " counter(pages);
      position: fixed;
      bottom: 1cm;
      left: 50%;
      transform: translateX(-50%);
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #666;
      z-index: 1000;
    }
    
    /* Incrementar contador a cada página */
    @page {
      counter-increment: page;
    }
    
    /* Preservar dimensões de imagens na impressão */
    img {
      display: block !important;
      page-break-inside: avoid !important;
      object-fit: contain !important;
      max-width: 100% !important;
    }
    
    /* Limitar imagens com atributos width/height muito grandes */
    img[width] {
      max-width: 100% !important;
      height: auto !important;
    }
    
    /* Se tem style inline com dimensões, preservar proporções */
    img[style*="width"] {
      max-width: 100% !important;
      height: auto !important;
    }
    
    /* Apenas aplicar max-width em imagens SEM dimensões inline */
    img:not([style*="width"]):not([style*="height"]):not([width]):not([height]) {
      max-width: 100% !important;
      height: auto !important;
    }
    
    /* Controlar espaçamento entre elementos na impressão */
    body {
      line-height: 1.2 !important;
    }
    
    p {
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1.2 !important;
    }
    
    /* Classes de espaçamento entre linhas */
    .line-height-1 { line-height: 1.0 !important; }
    .line-height-115 { line-height: 1.15 !important; }
    .line-height-12 { line-height: 1.2 !important; }
    .line-height-15 { line-height: 1.5 !important; }
    .line-height-2 { line-height: 2.0 !important; }
    
    p:empty {
      margin: 0 !important;
      padding: 0 !important;
      line-height: 0 !important;
      height: 0 !important;
      display: none !important;
    }
    
    br {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1 !important;
      height: 0.5em !important;
    }
    
    /* Adicionar pequeno espaço apenas entre parágrafos consecutivos */
    p + p {
      margin-top: 0.2em !important;
    }
    
    /* Espaçamento entre tabelas */
    figure.table {
      margin-top: 0 !important;
      margin-bottom: 0.5em !important;
    }
    
    figure.table + figure.table {
      margin-top: 0.5em !important;
    }
    
    /* Remover espaço entre parágrafos vazios e tabelas */
    p:empty + figure.table,
    figure.table + p:empty {
      margin: 0 !important;
    }
    
    /* Mapeia fontes específicas para garantir renderização - case insensitive */
    *[style*="courier" i],
    *[style*="Courier" i] {
      font-family: 'Courier New', Courier, monospace !important;
    }
    
    *[style*="arial" i],
    *[style*="Arial" i],
    *[style*="helvetica" i],
    *[style*="Helvetica" i] {
      font-family: Arial, Helvetica, sans-serif !important;
    }
    
    *[style*="times" i],
    *[style*="Times" i] {
      font-family: 'Times New Roman', Times, serif !important;
    }
    
    *[style*="georgia" i],
    *[style*="Georgia" i] {
      font-family: Georgia, serif !important;
    }
    
    *[style*="tahoma" i],
    *[style*="Tahoma" i] {
      font-family: Tahoma, Geneva, sans-serif !important;
    }
    
    *[style*="trebuchet" i],
    *[style*="Trebuchet" i] {
      font-family: 'Trebuchet MS', Helvetica, sans-serif !important;
    }
    
    *[style*="verdana" i],
    *[style*="Verdana" i] {
      font-family: Verdana, Geneva, sans-serif !important;
    }
    
    *[style*="roboto" i],
    *[style*="Roboto" i] {
      font-family: Roboto, sans-serif !important;
    }
  }
  
  /* Também aplica as fontes na tela para garantir consistência */
  *[style*="courier" i],
  *[style*="Courier" i] {
    font-family: 'Courier New', Courier, monospace;
  }
  
  *[style*="roboto" i],
  *[style*="Roboto" i] {
    font-family: Roboto, sans-serif;
  }
`;


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  id?: string;
  name?: string;
  ariaLabelledBy?: string;
  onInsertVariable?: (variable: string) => void;
  disableColors?: boolean;
  disableVariables?: boolean;
}

const RichTextEditorInner: React.ForwardRefRenderFunction<any, RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px',
  id,
  name,
  ariaLabelledBy,
  onInsertVariable,
  disableColors = false,
  disableVariables = false
}, ref) => {
  const editorInstanceRef = useRef<any>(null);

  // Adiciona as fontes e estilos no head do documento
  React.useEffect(() => {
    const styleId = 'ckeditor-print-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = editorStyles;
      document.head.appendChild(style);
    }

    // Carrega as fontes do Google
    const linkId = 'google-fonts-roboto';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Função para inserir variáveis
  const insertVariable = (variable: string) => {
    if (editorInstanceRef.current) {
      const editor = editorInstanceRef.current;
      const viewFragment = editor.data.processor.toView(variable);
      const modelFragment = editor.data.toModel(viewFragment);
      editor.model.insertContent(modelFragment);
    }
    if (onInsertVariable) {
      onInsertVariable(variable);
    }
  };

  // Expose insertVariable para uso externo
  useImperativeHandle(ref, () => ({
    insertVariable
  }));

  return (
    <div className="ckeditor-wrapper" style={{ height: '100%' }}>
      <CKEditor
        editor={ClassicEditor}
        config={{
          licenseKey: 'GPL',
          plugins: [
            Essentials,
            Bold,
            Italic,
            Underline,
            Paragraph,
            Heading,
            List,
            Link,
            Table,
            TableToolbar,
            TableProperties,
            TableCellProperties,
            Image,
            ImageUpload,
            ImageResize,
            ImageInsert,
            Base64UploadAdapter,
            Alignment,
            Font,
            FontSize,
            FontFamily,
            ...(disableColors ? [] : [FontColor, FontBackgroundColor]),
            ...(disableVariables ? [] : [VariablePlugin]),
            RemoveFormat,
            Undo,
            SourceEditing,
            GeneralHtmlSupport,
            BlockQuote,
            Code,
            HorizontalLine,
            Indent,
            IndentBlock
          ],
          toolbar: {
            items: [
              'undo', 'redo', '|',
              'sourceEditing', '|',
              ...(disableVariables ? [] : ['heading', 'variables', '|']),
              ...(disableVariables ? ['heading', '|'] : []),
              'bold', 'italic', 'underline', '|',
              'fontSize', 'fontFamily', ...(disableColors ? [] : ['fontColor', 'fontBackgroundColor']), '|',
              'alignment', '|',
              'bulletedList', 'numberedList', '|',
              'outdent', 'indent', '|',
              'link', 'insertImage', 'insertTable', 'blockQuote', 'horizontalLine', '|',
              'removeFormat'
            ],
            shouldNotGroupWhenFull: true
          },
          language: 'pt-br',
          fontSize: {
            options: [
              9, 11, 13, 'default', 17, 19, 21, 24, 28, 32, 36, 48, 72
            ],
            supportAllValues: true
          },
          fontFamily: {
            options: [
              'default',
              'Arial, Helvetica, sans-serif',
              'Courier New, Courier, monospace',
              'Georgia, serif',
              'Tahoma, Geneva, sans-serif',
              'Times New Roman, Times, serif',
              'Trebuchet MS, Helvetica, sans-serif',
              'Verdana, Geneva, sans-serif',
              'Roboto, sans-serif'
            ],
            supportAllValues: true
          },
          fontColor: {
            colors: [
              { color: 'hsl(0, 0%, 0%)', label: 'Black' },
              { color: 'hsl(0, 0%, 30%)', label: 'Dim grey' },
              { color: 'hsl(0, 0%, 60%)', label: 'Grey' },
              { color: 'hsl(0, 0%, 90%)', label: 'Light grey' },
              { color: 'hsl(0, 0%, 100%)', label: 'White', hasBorder: true },
              { color: 'hsl(0, 75%, 60%)', label: 'Red' },
              { color: 'hsl(25, 75%, 60%)', label: 'Orange' },
              { color: 'hsl(50, 75%, 60%)', label: 'Yellow' },
              { color: 'hsl(75, 75%, 60%)', label: 'Light green' },
              { color: 'hsl(100, 75%, 60%)', label: 'Green' },
              { color: 'hsl(125, 75%, 60%)', label: 'Aquamarine' },
              { color: 'hsl(150, 75%, 60%)', label: 'Turquoise' },
              { color: 'hsl(175, 75%, 60%)', label: 'Light blue' },
              { color: 'hsl(200, 75%, 60%)', label: 'Blue' },
              { color: 'hsl(225, 75%, 60%)', label: 'Dark blue' },
              { color: 'hsl(250, 75%, 60%)', label: 'Purple' },
              { color: 'hsl(275, 75%, 60%)', label: 'Pink' },
              { color: 'hsl(300, 75%, 60%)', label: 'Crimson' }
            ]
          },
          fontBackgroundColor: {
            colors: [
              { color: 'hsl(0, 0%, 0%)', label: 'Black' },
              { color: 'hsl(0, 0%, 30%)', label: 'Dim grey' },
              { color: 'hsl(0, 0%, 60%)', label: 'Grey' },
              { color: 'hsl(0, 0%, 90%)', label: 'Light grey' },
              { color: 'hsl(0, 0%, 100%)', label: 'White', hasBorder: true },
              { color: 'hsl(0, 75%, 60%)', label: 'Red' },
              { color: 'hsl(25, 75%, 60%)', label: 'Orange' },
              { color: 'hsl(50, 75%, 60%)', label: 'Yellow' },
              { color: 'hsl(75, 75%, 60%)', label: 'Light green' },
              { color: 'hsl(100, 75%, 60%)', label: 'Green' },
              { color: 'hsl(125, 75%, 60%)', label: 'Aquamarine' },
              { color: 'hsl(150, 75%, 60%)', label: 'Turquoise' },
              { color: 'hsl(175, 75%, 60%)', label: 'Light blue' },
              { color: 'hsl(200, 75%, 60%)', label: 'Blue' },
              { color: 'hsl(225, 75%, 60%)', label: 'Dark blue' },
              { color: 'hsl(250, 75%, 60%)', label: 'Purple' },
              { color: 'hsl(275, 75%, 60%)', label: 'Pink' },
              { color: 'hsl(300, 75%, 60%)', label: 'Crimson' }
            ]
          },
          style: {
            definitions: [
              {
                name: 'Espaçamento Simples (1.0)',
                element: 'p',
                classes: ['line-height-1']
              },
              {
                name: 'Espaçamento Compacto (1.15)',
                element: 'p',
                classes: ['line-height-115']
              },
              {
                name: 'Espaçamento Normal (1.2)',
                element: 'p',
                classes: ['line-height-12']
              },
              {
                name: 'Espaçamento Médio (1.5)',
                element: 'p',
                classes: ['line-height-15']
              },
              {
                name: 'Espaçamento Duplo (2.0)',
                element: 'p',
                classes: ['line-height-2']
              }
            ]
          },
          placeholder: placeholder,
          htmlSupport: {
            allow: [
              {
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true
              }
            ],
            disallow: []
          },
          // Permite todo tipo de HTML sem filtragem
          htmlEmbed: {
            showPreviews: true
          },
          image: {
            resizeUnit: 'px'
          },
          table: {
            contentToolbar: [
              'tableColumn',
              'tableRow',
              'mergeTableCells',
              'tableProperties',
              'tableCellProperties'
            ]
          }
        }}
        data={value}
        id={id}
        aria-labelledby={ariaLabelledBy}
        onReady={(editor) => {
          editorInstanceRef.current = editor;
          
          // Ajusta altura do editor
          const editorElement = editor.ui.view.editable.element;
          if (editorElement) {
            editorElement.style.minHeight = height;
            // Configurar acessibilidade
            if (id) editorElement.id = id;
            if (ariaLabelledBy) editorElement.setAttribute('aria-labelledby', ariaLabelledBy);
            editorElement.setAttribute('role', 'textbox');
            editorElement.setAttribute('aria-multiline', 'true');
          }

          // Remover label interno do CKEditor do DOM (causa avisos de acessibilidade)
          setTimeout(() => {
            const editable = editor.ui.view.editable.element;
            if (editable) {
              const editorRoot = editable.closest('.ck-editor');
              if (editorRoot) {
                const ckLabels = editorRoot.querySelectorAll('.ck-voice-label');
                ckLabels.forEach(label => {
                  label.remove(); // Remove completamente do DOM
                });
              }
            }
          }, 100);

          // Altura do textarea source agora é controlada por CSS em themes.css
          // O usuário pode redimensionar manualmente com resize: vertical
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
};

const RichTextEditor = forwardRef(RichTextEditorInner);

export { RichTextEditor, type RichTextEditorProps };
RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;