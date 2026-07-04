import React, { useRef } from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import type { RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';

const AdesaoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do termo de adesão...",
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <ModalRichTextEditor
      ref={editorRef}
      editorKey={editorKey}
      id="conteudo_adesao"
      name="conteudo_adesao"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

export default AdesaoTab;

