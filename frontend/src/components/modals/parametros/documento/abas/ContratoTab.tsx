import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '../../../../common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const ContratoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  onInsertVariable,
  editorKey
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
      id="conteudo_contrato"
      name="conteudo_contrato"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder="Digite o conteúdo do modelo de contrato..."
      height="100%"
      onInsertVariable={handleInsertVariable}
    />
  );
};

export default ContratoTab;

