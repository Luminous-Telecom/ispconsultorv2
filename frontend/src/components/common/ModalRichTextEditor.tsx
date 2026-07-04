import React, { Suspense, forwardRef } from 'react';
import { LabelWithHelp } from 'components/ui/LabelWithHelp';
import {
  RichTextEditor,
  RichTextEditorFallback,
  type RichTextEditorProps,
  type RichTextEditorRef,
} from './RichTextEditorLazy';

export interface ModalRichTextEditorProps extends RichTextEditorProps {
  editorKey?: React.Key;
  label?: React.ReactNode;
  labelId?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  className?: string;
}

const ModalRichTextEditor = forwardRef<RichTextEditorRef, ModalRichTextEditorProps>(({
  editorKey,
  label,
  labelId,
  helperText,
  required = false,
  className = '',
  ariaLabelledBy,
  height = '420px',
  resize = true,
  ...editorProps
}, ref) => {
  const resolvedAriaLabelledBy = ariaLabelledBy ?? labelId;

  return (
    <div className={`modal-rich-text-editor ${className}`.trim()}>
      {label && (
        <div className="modal-rich-text-editor__header">
          <LabelWithHelp id={labelId} as="span" className="form-label small mb-0" required={required}>
            {label}
          </LabelWithHelp>
        </div>
      )}
      {helperText && (
        <small className="form-helper-message mb-1">{helperText}</small>
      )}
      <div className="modal-rich-text-editor__body">
        <Suspense fallback={<RichTextEditorFallback />}>
          <RichTextEditor
            ref={ref}
            key={editorKey}
            ariaLabelledBy={resolvedAriaLabelledBy}
            height={height}
            resize={resize}
            {...editorProps}
          />
        </Suspense>
      </div>
    </div>
  );
});

ModalRichTextEditor.displayName = 'ModalRichTextEditor';

export default ModalRichTextEditor;
