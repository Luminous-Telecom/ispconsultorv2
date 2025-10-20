import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  id?: string; // para associação com <label for="...">
  name?: string; // para compatibilidade com formulários/autofill
  ariaLabelledBy?: string; // para associar com <label id="...">
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
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const isUpdatingRef = useRef(false);
  const shadowHostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  // Filtra estilos permitidos (whitelist)
  const filterStyleAttribute = (styleValue: string): string => {
    // Mantém apenas text-align seguro
    const pairs = styleValue
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
    const allowed: string[] = [];
    for (const pair of pairs) {
      const [propRaw, valueRaw] = pair.split(':');
      if (!propRaw || !valueRaw) continue;
      const prop = propRaw.trim().toLowerCase();
      const value = valueRaw.trim().toLowerCase();
      if (prop === 'text-align' && /^(left|center|right|justify|start|end)$/.test(value)) {
        allowed.push(`${prop}: ${value}`);
      }
    }
    return allowed.join('; ');
  };

  // Função para sanitizar HTML e remover estilos perigosos
  const sanitizeHtml = (html: string): string => {
    // 1) Remove tags perigosas (multi-linha seguro)
    let sanitized = html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<link[\s\S]*?>/gi, '')
      .replace(/<meta[\s\S]*?>/gi, '')
      .replace(/<base[\s\S]*?>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?>/gi, '')
      .replace(/<svg[\s\S]*?>[\s\S]*?<\/svg>/gi, '');

    // 2) Remove/filtra atributos perigosos
    //   2.1) Filtra 'style' mantendo apenas propriedades permitidas
    sanitized = sanitized
      .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (_m, g1) => {
        const filtered = filterStyleAttribute(g1 || '');
        return filtered ? ` style="${filtered}"` : '';
      })
      .replace(/\sstyle\s*=\s*'([^']*)'/gi, (_m, g1) => {
        const filtered = filterStyleAttribute(g1 || '');
        return filtered ? ` style='${filtered}'` : '';
      })
      .replace(/\sclass\s*=\s*"[^"]*"/gi, '')
      .replace(/\sclass\s*=\s*'[^']*'/gi, '')
      .replace(/\sid\s*=\s*"[^"]*"/gi, '')
      .replace(/\sid\s*=\s*'[^']*'/gi, '')
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');

    // 3) Normaliza espaços extras gerados pelos replaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');

    return sanitized.trim();
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
      const sanitized = sanitizeHtml(editorRef.current.innerHTML);
      if (sanitized !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = sanitized;
      }
      onChange(sanitized);
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
        onChange(sanitizeHtml(textareaRef.current.value));
      }
    } else {
      // Indo para modo código
      if (editorRef.current) {
        onChange(sanitizeHtml(editorRef.current.innerHTML));
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

  // Sanitiza colagens para evitar estilos globais
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const onPaste = (e: ClipboardEvent) => {
      if (!editorRef.current) return;
      e.preventDefault();
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      const pastedHtml = clipboardData?.getData('text/html');
      const pastedText = clipboardData?.getData('text/plain');
      const content = pastedHtml ? sanitizeHtml(pastedHtml) : (pastedText || '');
      document.execCommand('insertHTML', false, content);
      handleInput();
    };

    editor.addEventListener('paste', onPaste as any);
    return () => {
      editor.removeEventListener('paste', onPaste as any);
    };
  }, []);

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
          id={id}
          name={name}
          aria-labelledby={ariaLabelledBy}
          value={value}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          // Permite redimensionar livremente no modo código (sem fixar altura)
          style={{ minHeight: height, height: 'auto', overflow: 'auto', resize: 'vertical' }}
          spellCheck={false}
        />
      ) : (
        <div
          ref={editorRef}
          className="rte-content"
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={ariaLabelledBy}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          data-placeholder={placeholder}
          style={{ minHeight: height, overflow: 'auto', resize: 'vertical' }}
        />
      )}
    </div>
  );
};

export { RichTextEditor, type RichTextEditorProps };
export default RichTextEditor;

