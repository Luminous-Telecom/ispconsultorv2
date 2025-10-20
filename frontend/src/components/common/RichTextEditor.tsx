import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const insertText = (text: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, text);
      handleInput();
    }
  };

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="rte-toolbar">
        <div className="btn-group btn-group-sm me-1" role="group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('bold')}
            title="Negrito"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('italic')}
            title="Itálico"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('underline')}
            title="Sublinhado"
          >
            <u>U</u>
          </button>
        </div>

        <div className="btn-group btn-group-sm me-1" role="group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('justifyLeft')}
            title="Alinhar à esquerda"
          >
            <i className="bi bi-text-left"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('justifyCenter')}
            title="Centralizar"
          >
            <i className="bi bi-text-center"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('justifyRight')}
            title="Alinhar à direita"
          >
            <i className="bi bi-text-right"></i>
          </button>
        </div>

        <div className="btn-group btn-group-sm me-1" role="group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('insertUnorderedList')}
            title="Lista não ordenada"
          >
            <i className="bi bi-list-ul"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('insertOrderedList')}
            title="Lista ordenada"
          >
            <i className="bi bi-list-ol"></i>
          </button>
        </div>

        <div className="btn-group btn-group-sm me-1" role="group">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('formatBlock', '<h1>')}
            title="Título 1"
          >
            H1
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('formatBlock', '<h2>')}
            title="Título 2"
          >
            H2
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('formatBlock', '<h3>')}
            title="Título 3"
          >
            H3
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => execCommand('formatBlock', '<p>')}
            title="Parágrafo"
          >
            P
          </button>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => execCommand('removeFormat')}
          title="Limpar formatação"
        >
          <i className="bi bi-eraser"></i>
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        className="rte-content"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        style={{ height, overflowY: 'auto' }}
      />
    </div>
  );
};

export { RichTextEditor, type RichTextEditorProps };
export default RichTextEditor;

