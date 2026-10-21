import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: ({ init }: { init: { toolbar_mode?: string; menubar?: boolean; skin?: string | boolean; skin_url?: string; content_css?: string | false } }) => (
    <div
      data-testid="tinymce"
      data-toolbar-mode={init.toolbar_mode}
      data-menubar={String(init.menubar)}
      data-skin={init.skin === undefined ? '' : String(init.skin)}
      data-skin-url={init.skin_url ?? ''}
      data-content-css={init.content_css === undefined ? '' : String(init.content_css)}
    />
  ),
}));

jest.mock('tinymce/tinymce', () => ({}));
jest.mock('tinymce/themes/silver', () => ({}));
jest.mock('tinymce/icons/default', () => ({}));
jest.mock('tinymce/models/dom', () => ({}));
jest.mock('tinymce/plugins/advlist', () => ({}));
jest.mock('tinymce/plugins/autolink', () => ({}));
jest.mock('tinymce/plugins/code', () => ({}));
jest.mock('tinymce/plugins/image', () => ({}));
jest.mock('tinymce/plugins/link', () => ({}));
jest.mock('tinymce/plugins/lists', () => ({}));
jest.mock('tinymce/plugins/searchreplace', () => ({}));
jest.mock('tinymce/plugins/table', () => ({}));
jest.mock('tinymce/plugins/wordcount', () => ({}));
jest.mock('tinymce/plugins/autoresize', () => ({}));
jest.mock('tinymce/skins/ui/oxide/skin', () => ({}));
jest.mock('tinymce/skins/ui/oxide/content', () => ({}));
jest.mock('tinymce/skins/content/default/content', () => ({}));
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
    expect(editor.getAttribute('data-skin')).toBe('oxide');
    expect(editor.getAttribute('data-skin-url')).toBe('');
    expect(editor.getAttribute('data-content-css')).toBe('default');
  });
});
