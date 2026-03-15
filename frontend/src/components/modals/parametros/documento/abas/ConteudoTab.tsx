import React, { Suspense, useRef } from 'react';
import { RichTextEditor, RichTextEditorFallback, type RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';

const ConteudoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
  placeholder = "Digite o conteúdo do documento..."
}) => {
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <Suspense fallback={<RichTextEditorFallback />}>
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
    </Suspense>
  );
};

export default ConteudoTab;

