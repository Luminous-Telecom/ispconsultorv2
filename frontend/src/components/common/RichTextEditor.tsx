import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Plugin, ButtonView } from 'ckeditor5';
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

// Plugin de Variáveis para CKEditor 5
class VariablesPlugin extends Plugin {
  static get pluginName() {
    return 'Variables';
  }

  init() {
    const editor = this.editor;

    // Define as variáveis disponíveis
    const variableGroups = [
      {
        label: 'Cliente',
        variables: [
          { label: 'Razão Social', value: '#cliente.razao_social#' },
          { label: 'Nome Fantasia', value: '#cliente.nome_fantasia#' },
          { label: 'CPF/CNPJ', value: '#cliente.cnpj#' },
          { label: 'E-mail', value: '#cliente.email#' },
          { label: 'Telefone', value: '#cliente.telefone#' },
          { label: 'WhatsApp', value: '#cliente.whatsapp#' },
          { label: 'Endereço', value: '#cliente.endereco#' }
        ]
      },
      {
        label: 'Contrato',
        variables: [
          { label: 'Plano', value: '#contrato.plano#' },
          { label: 'Data Início', value: '#contrato.data_inicio#' },
          { label: 'Data Fim', value: '#contrato.data_fim#' },
          { label: 'Desconto %', value: '#contrato.desconto_percentual#' },
          { label: 'Desconto R$', value: '#contrato.desconto_valor#' },
          { label: 'Isento Mensalidade', value: '#contrato.isento_mensalidade#' },
          { label: 'Dia Vencimento', value: '#contrato.dia_vencimento#' }
        ]
      },
      {
        label: 'Empresa',
        variables: [
          { label: 'Razão Social', value: '#empresa.razao_social#' },
          { label: 'Nome Fantasia', value: '#empresa.nome_fantasia#' },
          { label: 'CNPJ', value: '#empresa.cnpj#' },
          { label: 'Telefone', value: '#empresa.telefone#' },
          { label: 'E-mail', value: '#empresa.email#' },
          { label: 'Responsável', value: '#empresa.responsavel#' }
        ]
      },
      {
        label: 'Financeiro',
        variables: [
          { label: 'Total Aberto', value: '#financeiro.total_aberto#' },
          { label: 'Total Vencido', value: '#financeiro.total_vencido#' },
          { label: 'Títulos Abertos', value: '#financeiro.quantidade_titulos_abertos#' },
          { label: 'Maior Atraso (dias)', value: '#financeiro.maior_atraso_dias#' }
        ]
      },
      {
        label: 'Sistema',
        variables: [
          { label: 'Data Atual', value: '#sistema.data_atual#' },
          { label: 'Hora Atual', value: '#sistema.hora_atual#' }
        ]
      }
    ];

    // Adiciona o botão de variáveis na toolbar
    editor.ui.componentFactory.add('insertVariables', locale => {
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: 'Variáveis',
        icon: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h14v2H3v-2zm0 4h10v2H3v-2z"/></svg>',
        tooltip: true
      });

      // Quando o botão é clicado
      buttonView.on('execute', () => {
        this.showVariablesMenu(editor, variableGroups);
      });

      return buttonView;
    });
  }

  showVariablesMenu(editor: any, variableGroups: any[]) {
    // Criar um elemento de menu customizado
    const menuDiv = document.createElement('div');
    menuDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #1976d2;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
      min-width: 400px;
    `;

    // Título
    const title = document.createElement('h3');
    title.textContent = 'Inserir Variável';
    title.style.cssText = 'margin: 0 0 15px 0; color: #1976d2; font-size: 18px;';
    menuDiv.appendChild(title);

    // Criar grupos de variáveis
    variableGroups.forEach(group => {
      const groupLabel = document.createElement('div');
      groupLabel.textContent = group.label;
      groupLabel.style.cssText = 'font-weight: bold; margin: 10px 0 5px 0; color: #333; font-size: 14px;';
      menuDiv.appendChild(groupLabel);

      group.variables.forEach((variable: any) => {
        const button = document.createElement('button');
        button.textContent = variable.label;
        button.style.cssText = `
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          margin: 2px 0;
          border: 1px solid #e0e0e0;
          background: #f5f5f5;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        `;
        
        button.onmouseover = () => {
          button.style.background = '#e3f2fd';
          button.style.borderColor = '#1976d2';
        };
        
        button.onmouseout = () => {
          button.style.background = '#f5f5f5';
          button.style.borderColor = '#e0e0e0';
        };

        button.onclick = () => {
          editor.model.change((writer: any) => {
            const insertPosition = editor.model.document.selection.getFirstPosition();
            writer.insertText(variable.value, insertPosition);
          });
          document.body.removeChild(overlay);
        };

        menuDiv.appendChild(button);
      });
    });

    // Botão fechar
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Fechar';
    closeButton.style.cssText = `
      margin-top: 15px;
      padding: 8px 16px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      width: 100%;
      font-weight: 500;
    `;
    closeButton.onclick = () => document.body.removeChild(overlay);
    menuDiv.appendChild(closeButton);

    // Overlay de fundo
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };

    overlay.appendChild(menuDiv);
    document.body.appendChild(overlay);
  }
}

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
            IndentBlock,
            VariablesPlugin  // Plugin de variáveis adicionado
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
              'insertVariables', '|',  // Botão de variáveis na toolbar
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