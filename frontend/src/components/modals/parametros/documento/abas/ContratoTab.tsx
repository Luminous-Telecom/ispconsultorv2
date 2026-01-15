import React, { useRef } from 'react';
import RichTextEditor, { type RichTextEditorRef } from '@/components/common/RichTextEditor';
import { DocumentoTabProps } from '../types';
import { useI18n } from '@/contexts/I18nContext';

const ContratoTab: React.FC<DocumentoTabProps> = ({
  value,
  onChange,
  editorKey
}) => {
  const { t } = useI18n();
  const editorRef = useRef<RichTextEditorRef | null>(null);

  return (
    <RichTextEditor
      ref={editorRef}
      key={editorKey}
      id="conteudo_contrato"
      name="conteudo_contrato"
      ariaLabelledBy="conteudo-label"
      value={value}
      onChange={onChange}
      placeholder={t('placeholder.contractContent')}
      height="100%"
    />
  );
};

export default ContratoTab;

