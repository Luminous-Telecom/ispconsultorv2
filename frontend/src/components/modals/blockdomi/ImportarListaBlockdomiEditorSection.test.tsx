import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import ImportarListaBlockdomiEditorSection from './ImportarListaBlockdomiEditorSection';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

const t = ((key: string) => {
  const labels: Record<string, string> = {
    'blockdomi.inputListLabel': 'Lista de entrada',
    'blockdomi.pasteListHint': 'Cole domínios ou IPs (um por linha)',
    'blockdomi.importIntro': 'Cole a lista',
    'blockdomi.paste': 'Colar',
    'buttons.clear': 'Limpar',
    'blockdomi.analyze': 'Analisar',
  };
  return labels[key] ?? key;
}) as BlockdomiImportTranslateFn;

function renderSection() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>
        <ImportarListaBlockdomiEditorSection
          t={t}
          rawText=""
          domainCount={0}
          onRawTextChange={jest.fn()}
          onPaste={jest.fn()}
          onClear={jest.fn()}
          onAnalisar={jest.fn()}
          isAnalyzing={false}
          classified={null}
          listaModo="bloqueio"
          onListaModoChange={jest.fn()}
          onCadastrar={jest.fn()}
          canCadastrar={false}
          isCadastrando={false}
        />
      </NotificationProvider>
    </I18nProvider>,
  );
}

it('coloca Lista de entrada antes do textarea, na mesma linha dos inputs', () => {
  renderSection();

  const textarea = screen.getByPlaceholderText('Cole domínios ou IPs (um por linha)');
  const label = screen.getByText('Lista de entrada');
  const field = textarea.closest('.form-field');

  expect(field).not.toBeNull();
  expect(label.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(textarea.classList.contains('form-control')).toBe(true);
  expect(textarea.parentElement?.classList.contains('form-field-control')).toBe(true);
  expect(field?.classList.contains('ilb-lista-entrada')).toBe(false);
  expect(screen.getByRole('button', { name: 'Colar' }).closest('.form-modal-input-col')).not.toBeNull();
});
