import React, { Suspense, useRef } from 'react';
import { RichTextEditor, RichTextEditorFallback, type RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';

const PermanenciaTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do contrato de permanência..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <Suspense fallback={<RichTextEditorFallback />}>
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
      />
    </Suspense>
  );
};

export default PermanenciaTab;

