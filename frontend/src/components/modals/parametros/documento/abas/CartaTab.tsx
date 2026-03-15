import React, { Suspense, useRef } from 'react';
import { RichTextEditor, RichTextEditorFallback, type RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const CartaTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey
}) => {
  const { t } = useI18n();
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <Suspense fallback={<RichTextEditorFallback />}>
      <RichTextEditor
        ref={editorRef}
        key={editorKey}
        id="conteudo_carta"
        name="conteudo_carta"
        ariaLabelledBy="conteudo-label"
        value={value}
        onChange={onChange}
        placeholder={t('placeholder.letterContent')}
        height="100%"
      />
    </Suspense>
  );
};

export default CartaTab;

