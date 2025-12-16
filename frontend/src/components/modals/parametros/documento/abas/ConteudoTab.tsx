import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const ConteudoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do documento..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

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
    />
  );
};

export default ConteudoTab;

