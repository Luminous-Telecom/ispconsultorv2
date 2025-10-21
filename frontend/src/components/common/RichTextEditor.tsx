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
  FontFamily
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
  
  /* Garante que as fontes inline sejam respeitadas na impressão em TODO o documento */
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
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
            Alignment,
            Font,
            FontSize,
            FontFamily,
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
              'heading', '|',
              'bold', 'italic', 'underline', '|',
              'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor', '|',
              'alignment', '|',
              'bulletedList', 'numberedList', '|',
              'outdent', 'indent', '|',
              'link', 'insertTable', 'blockQuote', 'horizontalLine', '|',
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
            toolbar: [
              'imageTextAlternative',
              'imageResize'
            ],
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

              // Adicionar dropdown de variáveis
              const variablesDropdown = document.createElement('select');
              variablesDropdown.style.cssText = `
                padding: 4px 8px;
                margin: 0 4px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: white;
                font-size: 12px;
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
                  { value: '#cliente.endereco#', text: '#cliente.endereco#' }
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
                  { value: '#empresa.endereco#', text: '#empresa.endereco#' },
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

              // Adicionar apenas o dropdown à toolbar
              toolbar.appendChild(variablesDropdown);
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