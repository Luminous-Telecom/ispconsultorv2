import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const PermanenciaTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  onInsertVariable,
  editorKey,
  placeholder = "Digite o conteúdo do contrato de permanência..."
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
      id="conteudo_permanencia"
      name="conteudo_permanencia"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      height="100%"
      onInsertVariable={handleInsertVariable}
    />
  );
};

export default PermanenciaTab;

