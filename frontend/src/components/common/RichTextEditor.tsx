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
  Base64UploadAdapter,
  Style
} from 'ckeditor5';
import { 
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties
} from 'ckeditor5';

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
}

const RichTextEditor = forwardRef<any, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px',
  id,
  name,
  ariaLabelledBy,
  onInsertVariable
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
            Style,
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
              'heading', 'style', '|',
              'bold', 'italic', 'underline', '|',
              'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
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

          // Adicionar botão de variáveis na toolbar
          setTimeout(() => {
            const toolbar = document.querySelector('.ck.ck-toolbar');
            if (toolbar) {

              // Criar label que conterá o dropdown (nested approach)
              const variablesLabel = document.createElement('label');
              variablesLabel.style.cssText = `
                display: inline-flex;
                align-items: center;
                margin: 0;
                cursor: pointer;
              `;

              // Criar span sr-only dentro do label
              const labelText = document.createElement('span');
              labelText.textContent = 'Variáveis disponíveis: ';
              labelText.style.cssText = `
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
              `;

              // Adicionar dropdown de variáveis (será nested no label)
              const variablesDropdown = document.createElement('select');
              variablesDropdown.id = 'ckeditor-variables-dropdown';
              variablesDropdown.name = 'variables';
              variablesDropdown.setAttribute('aria-label', 'Selecionar variável para inserir no documento');
              variablesDropdown.style.cssText = `
                padding: 4px 8px;
                margin: 0 4px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: white;
                font-size: 12px;
                cursor: pointer;
              `;

              // Adicionar opções
              const options = [
                { value: '', text: 'Escolher variável...' },
                { group: 'Cliente', options: [
                  { value: '#cliente.razao_social#', text: '#cliente.razao_social#' },
                  { value: '#cliente.nome_fantasia#', text: '#cliente.nome_fantasia#' },
                  { value: '#cliente.cnpj#', text: '#cliente.cnpj#' },
                  { value: '#cliente.email#', text: '#cliente.email#' },
                  { value: '#cliente.telefone#', text: '#cliente.telefone#' },
                  { value: '#cliente.whatsapp#', text: '#cliente.whatsapp#' },
                  { value: '#cliente.endereco#', text: '#cliente.endereco#' },
                  { value: '#cliente.logradouro#', text: '#cliente.logradouro#' },
                  { value: '#cliente.numero#', text: '#cliente.numero#' },
                  { value: '#cliente.complemento#', text: '#cliente.complemento#' },
                  { value: '#cliente.bairro#', text: '#cliente.bairro#' },
                  { value: '#cliente.cidade#', text: '#cliente.cidade#' },
                  { value: '#cliente.estado#', text: '#cliente.estado#' },
                  { value: '#cliente.cep#', text: '#cliente.cep#' }
                ]},
                { group: 'Contrato', options: [
                  { value: '#contrato.plano#', text: '#contrato.plano#' },
                  { value: '#contrato.valor_contrato#', text: '#contrato.valor_contrato#' },
                  { value: '#contrato.data_inicio#', text: '#contrato.data_inicio#' },
                  { value: '#contrato.data_fim#', text: '#contrato.data_fim#' },
                  { value: '#contrato.desconto_percentual#', text: '#contrato.desconto_percentual#' },
                  { value: '#contrato.desconto_valor#', text: '#contrato.desconto_valor#' },
                  { value: '#contrato.isento_mensalidade#', text: '#contrato.isento_mensalidade#' },
                  { value: '#contrato.dia_vencimento#', text: '#contrato.dia_vencimento#' }
                ]},
                { group: 'Empresa', options: [
                  { value: '#empresa.razao_social#', text: '#empresa.razao_social#' },
                  { value: '#empresa.nome_fantasia#', text: '#empresa.nome_fantasia#' },
                  { value: '#empresa.cnpj#', text: '#empresa.cnpj#' },
                  { value: '#empresa.logo#', text: '#empresa.logo#' },
                  { value: '#empresa.endereco#', text: '#empresa.endereco#' },
                  { value: '#empresa.logradouro#', text: '#empresa.logradouro#' },
                  { value: '#empresa.numero#', text: '#empresa.numero#' },
                  { value: '#empresa.complemento#', text: '#empresa.complemento#' },
                  { value: '#empresa.bairro#', text: '#empresa.bairro#' },
                  { value: '#empresa.cidade#', text: '#empresa.cidade#' },
                  { value: '#empresa.estado#', text: '#empresa.estado#' },
                  { value: '#empresa.cep#', text: '#empresa.cep#' },
                  { value: '#empresa.telefone#', text: '#empresa.telefone#' },
                  { value: '#empresa.email#', text: '#empresa.email#' },
                  { value: '#empresa.responsavel#', text: '#empresa.responsavel#' }
                ]},
                { group: 'Financeiro', options: [
                  { value: '#financeiro.total_aberto#', text: '#financeiro.total_aberto#' },
                  { value: '#financeiro.total_vencido#', text: '#financeiro.total_vencido#' },
                  { value: '#financeiro.quantidade_titulos_abertos#', text: '#financeiro.quantidade_titulos_abertos#' },
                  { value: '#financeiro.maior_atraso_dias#', text: '#financeiro.maior_atraso_dias#' }
                ]},
                { group: 'Sistema', options: [
                  { value: '#sistema.data_atual#', text: '#sistema.data_atual#' },
                  { value: '#sistema.hora_atual#', text: '#sistema.hora_atual#' },
                  { value: '#assinatura_consultor#', text: '#assinatura_consultor#' },
                  { value: '#assinatura_cliente#', text: '#assinatura_cliente#' }
                ]}
              ];

              options.forEach(item => {
                if (item.group) {
                  const optgroup = document.createElement('optgroup');
                  optgroup.label = item.group;
                  item.options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.text;
                    optgroup.appendChild(opt);
                  });
                  variablesDropdown.appendChild(optgroup);
                } else {
                  const opt = document.createElement('option');
                  opt.value = item.value || '';
                  opt.textContent = item.text || '';
                  variablesDropdown.appendChild(opt);
                }
              });

              // Evento do dropdown
              variablesDropdown.onchange = (e) => {
                const target = e.target as HTMLSelectElement;
                if (target && target.value) {
                  editor.model.change(writer => {
                    const insertPosition = editor.model.document.selection.getFirstPosition();
                    if (insertPosition) {
                      writer.insertText(target.value, insertPosition);
                    }
                  });
                  target.value = '';
                }
              };

              // Adicionar texto sr-only e dropdown ao label (nested approach)
              variablesLabel.appendChild(labelText);
              variablesLabel.appendChild(variablesDropdown);
              
              // Adicionar label à toolbar
              toolbar.appendChild(variablesLabel);
            }
          }, 100);
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
});

export { RichTextEditor, type RichTextEditorProps };
RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;