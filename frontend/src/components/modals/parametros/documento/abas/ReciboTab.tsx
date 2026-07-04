import React, { useRef } from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import type { RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const ReciboTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey,
}) => {
  const { t } = useI18n();
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <ModalRichTextEditor
      ref={editorRef}
      editorKey={editorKey}
      id="conteudo_recibo"
      name="conteudo_recibo"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={t('placeholder.receiptContent')}
    />
  );
};

export default ReciboTab;

