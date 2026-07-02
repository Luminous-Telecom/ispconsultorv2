import React from 'react';

const RichTextEditor = React.lazy(() => import('./RichTextEditor'));

export { RichTextEditor };
export type { RichTextEditorRef, RichTextEditorProps } from './RichTextEditor';

export function RichTextEditorFallback() {
  return (
    <div className="d-flex align-items-center justify-content-center p-3 text-muted rich-text-editor-fallback" >
      Carregando editor...
    </div>
  );
}
