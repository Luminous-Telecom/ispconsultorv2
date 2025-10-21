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
      <style>
        {`
          .ck.ck-heading-dropdown .ck-button__label {
            font-weight: 500;
            color: #1976d2;
          }
          .ck.ck-heading-dropdown {
            border: 2px solid #1976d2;
            border-radius: 4px;
            background: #f5f5f5;
            min-width: 140px;
          }
          .ck.ck-heading-dropdown .ck-button__label {
            color: #1976d2;
            font-size: 14px;
          }
          .ck.ck-heading-dropdown:hover {
            background: #e3f2fd;
          }
          .variables-dropdown {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .variables-dropdown select {
            padding: 6px 12px;
            border: 2px solid #1976d2;
            border-radius: 4px;
            background: #f5f5f5;
            color: #1976d2;
            font-weight: 500;
            min-width: 140px;
          }
          .variables-dropdown select:hover {
            background: #e3f2fd;
          }
          .variables-dropdown label {
            font-weight: 500;
            color: #333;
            margin: 0;
          }
        `}
      </style>
      
      {/* Dropdown de Variáveis */}
      <div className="variables-dropdown">
        <label htmlFor="variables-select">Variáveis:</label>
        <select 
          id="variables-select"
          onChange={(e) => {
            if (e.target.value) {
              insertVariable(e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="">Escolher variável...</option>
          <optgroup label="Cliente">
            <option value="#cliente.razao_social#">Razão Social</option>
            <option value="#cliente.nome_fantasia#">Nome Fantasia</option>
            <option value="#cliente.cnpj#">CPF/CNPJ</option>
            <option value="#cliente.email#">E-mail</option>
            <option value="#cliente.telefone#">Telefone</option>
            <option value="#cliente.whatsapp#">WhatsApp</option>
            <option value="#cliente.endereco#">Endereço</option>
          </optgroup>
          <optgroup label="Contrato">
            <option value="#contrato.plano#">Plano</option>
            <option value="#contrato.data_inicio#">Data Início</option>
            <option value="#contrato.data_fim#">Data Fim</option>
            <option value="#contrato.desconto_percentual#">Desconto %</option>
            <option value="#contrato.desconto_valor#">Desconto R$</option>
            <option value="#contrato.isento_mensalidade#">Isento Mensalidade</option>
            <option value="#contrato.dia_vencimento#">Dia Vencimento</option>
          </optgroup>
          <optgroup label="Empresa">
            <option value="#empresa.razao_social#">Razão Social</option>
            <option value="#empresa.nome_fantasia#">Nome Fantasia</option>
            <option value="#empresa.cnpj#">CNPJ</option>
            <option value="#empresa.telefone#">Telefone</option>
            <option value="#empresa.email#">E-mail</option>
            <option value="#empresa.responsavel#">Responsável</option>
          </optgroup>
          <optgroup label="Financeiro">
            <option value="#financeiro.total_aberto#">Total Aberto</option>
            <option value="#financeiro.total_vencido#">Total Vencido</option>
            <option value="#financeiro.quantidade_titulos_abertos#">Títulos Abertos</option>
            <option value="#financeiro.maior_atraso_dias#">Maior Atraso (dias)</option>
          </optgroup>
          <optgroup label="Sistema">
            <option value="#sistema.data_atual#">Data Atual</option>
            <option value="#sistema.hora_atual#">Hora Atual</option>
          </optgroup>
        </select>
      </div>
      
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
          heading: {
            options: [
              { model: 'paragraph', title: 'Parágrafo', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Título 4', class: 'ck-heading_heading4' },
              { model: 'heading5', view: 'h5', title: 'Título 5', class: 'ck-heading_heading5' },
              { model: 'heading6', view: 'h6', title: 'Título 6', class: 'ck-heading_heading6' }
            ]
          },
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
