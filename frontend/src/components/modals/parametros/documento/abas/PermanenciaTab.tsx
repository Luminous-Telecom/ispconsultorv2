import React, { useRef } from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import type { RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';

const PermanenciaTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do contrato de permanência...",
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <ModalRichTextEditor
      ref={editorRef}
      editorKey={editorKey}
      id="conteudo_permanencia"
      name="conteudo_permanencia"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

export default PermanenciaTab;

