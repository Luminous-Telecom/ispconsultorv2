import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '../../../../common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const ConteudoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  onInsertVariable,
  editorKey,
  placeholder = "Digite o conteúdo do documento..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);
  
  const handleInsertVariable = (variable: string) => {
    editorRef.current?.insertVariable?.(variable);
    onInsertVariable?.(variable);
  };

  return (
    <RichTextEditor
      ref={editorRef}
      key={editorKey}
      id="conteudo"
      name="conteudo"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      height="100%"
      onInsertVariable={handleInsertVariable}
    />
  );
};

export default ConteudoTab;

