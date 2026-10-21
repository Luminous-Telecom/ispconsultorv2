import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: ({ init }: { init: { toolbar_mode?: string; menubar?: boolean } }) => (
    <div
      data-testid="tinymce"
      data-toolbar-mode={init.toolbar_mode}
      data-menubar={String(init.menubar)}
    />
  ),
}));

jest.mock('tinymce/tinymce', () => ({}));
jest.mock('tinymce/themes/silver', () => ({}));
jest.mock('tinymce/icons/default', () => ({}));
jest.mock('tinymce/models/dom', () => ({}));
jest.mock('tinymce/plugins/advlist', () => ({}));
jest.mock('tinymce/plugins/anchor', () => ({}));
jest.mock('tinymce/plugins/autolink', () => ({}));
jest.mock('tinymce/plugins/charmap', () => ({}));
jest.mock('tinymce/plugins/code', () => ({}));
jest.mock('tinymce/plugins/fullscreen', () => ({}));
jest.mock('tinymce/plugins/image', () => ({}));
jest.mock('tinymce/plugins/insertdatetime', () => ({}));
jest.mock('tinymce/plugins/link', () => ({}));
jest.mock('tinymce/plugins/lists', () => ({}));
jest.mock('tinymce/plugins/media', () => ({}));
jest.mock('tinymce/plugins/searchreplace', () => ({}));
jest.mock('tinymce/plugins/table', () => ({}));
jest.mock('tinymce/plugins/visualblocks', () => ({}));
jest.mock('tinymce/plugins/wordcount', () => ({}));
jest.mock('tinymce/plugins/autoresize', () => ({}));
jest.mock('tinymce-i18n/langs/pt_BR', () => ({}));

import RichTextEditor from './RichTextEditor';

describe('RichTextEditor', () => {
  it('mantém a barra de botões dentro do editor', () => {
    localStorage.setItem('app-language', 'pt-BR');
    render(
      <I18nProvider>
        <RichTextEditor value="<p>Modelo</p>" onChange={jest.fn()} />
      </I18nProvider>
    );

    const editor = screen.getByTestId('tinymce');
    expect(editor.getAttribute('data-toolbar-mode')).toBe('wrap');
    expect(editor.getAttribute('data-menubar')).toBe('false');
  });
});
