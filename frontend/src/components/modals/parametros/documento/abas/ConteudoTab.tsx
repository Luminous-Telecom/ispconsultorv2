import React, { useRef } from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import type { RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';

const ConteudoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do documento..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <ModalRichTextEditor
      ref={editorRef}
      editorKey={editorKey}
      id="conteudo"
      name="conteudo"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

export default ConteudoTab;

