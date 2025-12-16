import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';
import { DocumentoTabProps } from '../types';

const AdesaoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do termo de adesão..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <RichTextEditor
      ref={editorRef}
      key={editorKey}
      id="conteudo_adesao"
      name="conteudo_adesao"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      height="100%"
    />
  );
};

export default AdesaoTab;

