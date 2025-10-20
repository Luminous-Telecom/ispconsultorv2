import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  onInsertVariable?: (variable: string) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '250px',
  onInsertVariable
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const isUpdatingRef = useRef(false);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // Função para sanitizar HTML e remover estilos perigosos
  const sanitizeHtml = (html: string): string => {
    // Remove estilos inline que podem interferir
    let sanitized = html
      .replace(/style\s*=\s*["'][^"']*["']/gi, '') // Remove style attributes
      .replace(/class\s*=\s*["'][^"']*["']/gi, '') // Remove class attributes
      .replace(/id\s*=\s*["'][^"']*["']/gi, '') // Remove id attributes
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
      .replace(/<link[^>]*>/gi, '') // Remove link tags
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags
      .replace(/<style[^>]*>.*?<\/style>/gi, ''); // Remove style tags
    
    return sanitized;
  };

  useEffect(() => {
    // Prevenir loop infinito
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }

    if (!isCodeMode && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      // Sanitiza o HTML antes de inserir
      const sanitizedValue = sanitizeHtml(value);
      // Só atualiza se o valor for diferente (ignorando espaços extras)
      if (currentHtml.trim() !== sanitizedValue.trim() && sanitizedValue !== currentHtml) {
        editorRef.current.innerHTML = sanitizedValue;
      }
    }
    if (isCodeMode && textareaRef.current) {
      if (textareaRef.current.value !== value) {
        textareaRef.current.value = value;
      }
    }
  }, [value, isCodeMode]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isUpdatingRef.current = true;
    onChange(e.target.value);
  };

  const toggleCodeMode = () => {
    if (isCodeMode) {
      // Voltando do modo código para visual
      if (textareaRef.current) {
        onChange(textareaRef.current.value);
      }
    } else {
      // Indo para modo código
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
    setIsCodeMode(!isCodeMode);
  };

  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
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

  // Função para inserir variáveis de forma segura
  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const variableText = `{${variable}}`;
      document.execCommand('insertText', false, variableText);
      handleInput();
    }
    if (onInsertVariable) {
      onInsertVariable(variable);
    }
  };

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="rte-toolbar">
        {!isCodeMode && (
          <>
            <div className="btn-group btn-group-sm me-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => execCommand('bold')}
                title="Negrito"
              >
                <i className="bi bi-type-bold"></i>
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => execCommand('italic')}
                title="Itálico"
              >
                <i className="bi bi-type-italic"></i>
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => execCommand('underline')}
                title="Sublinhado"
              >
                <i className="bi bi-type-underline"></i>
              </button>
            </div>

            <div className="btn-group btn-group-sm me-2" role="group">
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

            <div className="btn-group btn-group-sm me-2" role="group">
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

            <div className="btn-group btn-group-sm me-2" role="group">
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
              className="btn btn-outline-secondary btn-sm me-2"
              onClick={() => execCommand('removeFormat')}
              title="Limpar formatação"
            >
              <i className="bi bi-eraser"></i>
            </button>
          </>
        )}

        <button
          type="button"
          className={`btn btn-sm ${isCodeMode ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={toggleCodeMode}
          title={isCodeMode ? 'Voltar para modo visual' : 'Ver código HTML'}
        >
          <i className="bi bi-code-slash me-1"></i>
          Código
        </button>
      </div>

      {/* Editor ou Textarea */}
      {isCodeMode ? (
        <textarea
          ref={textareaRef}
          className="rte-code"
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          style={{ height, overflowY: 'auto' }}
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          className="rte-content"
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          style={{ height, overflowY: 'auto' }}
        />
      )}
    </div>
  );
};

export { RichTextEditor, type RichTextEditorProps };
export default RichTextEditor;

