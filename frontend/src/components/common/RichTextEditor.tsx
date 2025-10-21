import React, { useRef } from 'react';
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px',
  id,
  name,
  ariaLabelledBy,
  onInsertVariable
}) => {
  const editorInstanceRef = useRef<any>(null);

  // Função para inserir variáveis
  const insertVariable = (variable: string) => {
    if (editorInstanceRef.current) {
      const editor = editorInstanceRef.current;
      const viewFragment = editor.data.processor.toView(`{${variable}}`);
      const modelFragment = editor.data.toModel(viewFragment);
      editor.model.insertContent(modelFragment);
    }
    if (onInsertVariable) {
      onInsertVariable(variable);
    }
  };

  // Expose insertVariable para uso externo
  React.useImperativeHandle(editorInstanceRef, () => ({
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
          heading: {
            options: [
              { model: 'paragraph', title: 'Parágrafo', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' }
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
              'Lucida Sans Unicode, Lucida Grande, sans-serif',
              'Tahoma, Geneva, sans-serif',
              'Times New Roman, Times, serif',
              'Trebuchet MS, Helvetica, sans-serif',
              'Verdana, Geneva, sans-serif'
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
};

export { RichTextEditor, type RichTextEditorProps };
export default RichTextEditor;
