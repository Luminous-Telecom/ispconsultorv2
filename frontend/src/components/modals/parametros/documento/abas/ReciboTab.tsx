import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const ReciboTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <RichTextEditor
      ref={editorRef}
      key={editorKey}
      id="conteudo_recibo"
      name="conteudo_recibo"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder="Digite o conteúdo do modelo de recibo..."
      height="100%"
    />
  );
};

export default ReciboTab;

