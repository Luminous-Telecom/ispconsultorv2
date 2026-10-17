import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import SidebarAccordionFolder from './SidebarAccordionFolder';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';
import type { SidebarMenuItem } from './types';

jest.mock('hooks/usePrefersRealHover', () => ({
  usePrefersRealHover: jest.fn(),
}));

const mockPrefersHover = usePrefersRealHover as jest.MockedFunction<typeof usePrefersRealHover>;

const items: SidebarMenuItem[] = [
  { id: 'clientes', label: 'Clientes', onClick: jest.fn() },
];

function renderFolder() {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <SidebarAccordionFolder
        accordionId="cadastrosAccordion"
        collapseId="cadastrosCollapse"
        headingId="cadastrosHeading"
        title="Cadastros"
        items={items}
        t={(key) => key}
        onItemClick={jest.fn()}
      />
    </I18nProvider>
  );
}

function getCollapse() {
  return document.getElementById('cadastrosCollapse');
}

describe('SidebarAccordionFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('abre a pasta ao passar o mouse quando o ambiente tem hover real', () => {
    mockPrefersHover.mockReturnValue(true);
    renderFolder();

    const folderButton = screen.getByRole('button', { name: 'Cadastros' });
    expect(folderButton.getAttribute('aria-expanded')).toBe('false');
    expect(getCollapse()?.classList.contains('show')).toBe(false);

    fireEvent.mouseEnter(folderButton.closest('.accordion-item')!);

    expect(folderButton.getAttribute('aria-expanded')).toBe('true');
    expect(getCollapse()?.classList.contains('show')).toBe(true);
  });

  it('fecha a pasta ao sair com o mouse quando o ambiente tem hover real', () => {
    mockPrefersHover.mockReturnValue(true);
    renderFolder();

    const item = screen.getByRole('button', { name: 'Cadastros' }).closest('.accordion-item')!;
    fireEvent.mouseEnter(item);
    expect(getCollapse()?.classList.contains('show')).toBe(true);

    fireEvent.mouseLeave(item);
    expect(screen.getByRole('button', { name: 'Cadastros' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
    expect(getCollapse()?.classList.contains('show')).toBe(false);
  });

  it('abre e fecha a pasta por clique quando não há hover real', () => {
    mockPrefersHover.mockReturnValue(false);
    renderFolder();

    const folderButton = screen.getByRole('button', { name: 'Cadastros' });
    expect(folderButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(folderButton);
    expect(folderButton.getAttribute('aria-expanded')).toBe('true');
    expect(getCollapse()?.classList.contains('show')).toBe(true);

    fireEvent.click(folderButton);
    expect(folderButton.getAttribute('aria-expanded')).toBe('false');
    expect(getCollapse()?.classList.contains('show')).toBe(false);
  });
});
