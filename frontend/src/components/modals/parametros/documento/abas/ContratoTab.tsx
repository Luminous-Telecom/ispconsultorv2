import React, { useRef } from 'react';
import ModalRichTextEditor from 'components/common/ModalRichTextEditor';
import type { RichTextEditorRef } from 'components/common/RichTextEditorLazy';
import { DocumentoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const ContratoTab: React.FC<DocumentoTabProps> = ({
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
      id="conteudo_contrato"
      name="conteudo_contrato"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={t('placeholder.contractContent')}
      expandWithContent
    />
  );
};

export default ContratoTab;

