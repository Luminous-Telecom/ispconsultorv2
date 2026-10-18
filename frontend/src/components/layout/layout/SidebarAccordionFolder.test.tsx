import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import SidebarAccordionFolder from './SidebarAccordionFolder';
import type { SidebarMenuItem } from './types';

const items: SidebarMenuItem[] = [
  { id: 'clientes', modalId: 'clientes', label: 'Clientes', icon: '', onClick: jest.fn() },
];

function renderFolder(overrides: {
  isOpen?: boolean;
  selectedItemId?: string | null;
  onHoverIntent?: (folderId: string) => void;
  onHoverCancel?: (folderId: string) => void;
  onToggle?: (folderId: string) => void;
  onItemClick?: (item: SidebarMenuItem, folderPath: string[]) => void;
} = {}) {
  localStorage.setItem('app-language', 'pt-BR');
  const onHoverIntent = overrides.onHoverIntent ?? jest.fn();
  const onHoverCancel = overrides.onHoverCancel ?? jest.fn();
  const onToggle = overrides.onToggle ?? jest.fn();
  const onItemClick = overrides.onItemClick ?? jest.fn();

  render(
    <I18nProvider>
      <SidebarAccordionFolder
        accordionId="cadastrosAccordion"
        collapseId="cadastrosCollapse"
        headingId="cadastrosHeading"
        title="Cadastros"
        items={items}
        t={(key) => key}
        isOpen={overrides.isOpen ?? false}
        selectedItemId={overrides.selectedItemId ?? null}
        isNestedOpen={() => false}
        onHoverIntent={onHoverIntent}
        onHoverCancel={onHoverCancel}
        onToggle={onToggle}
        onItemClick={onItemClick}
      />
    </I18nProvider>
  );

  return { onHoverIntent, onHoverCancel, onToggle, onItemClick };
}

describe('SidebarAccordionFolder', () => {
  it('avisa intenção de hover e cancela ao sair da pasta', () => {
    const { onHoverIntent, onHoverCancel } = renderFolder();
    const item = screen.getByRole('button', { name: 'Cadastros' }).closest('.accordion-item')!;
    fireEvent.mouseEnter(item);
    expect(onHoverIntent).toHaveBeenCalledWith('cadastrosAccordion');
    fireEvent.mouseLeave(item);
    expect(onHoverCancel).toHaveBeenCalledWith('cadastrosAccordion');
  });

  it('mostra a pasta aberta quando isOpen e marca o item selecionado', () => {
    renderFolder({ isOpen: true, selectedItemId: 'clientes' });

    expect(screen.getByRole('button', { name: 'Cadastros' }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(document.getElementById('cadastrosCollapse')?.classList.contains('show')).toBe(true);
    expect(screen.getByRole('button', { name: 'Clientes' }).classList.contains('active')).toBe(true);
  });

  it('dispara onItemClick com o caminho da pasta', () => {
    const { onItemClick } = renderFolder({ isOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(onItemClick).toHaveBeenCalledWith(items[0], ['cadastrosAccordion']);
  });

  it('dispara onToggle ao clicar no cabeçalho da pasta', () => {
    const { onToggle } = renderFolder();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastros' }));
    expect(onToggle).toHaveBeenCalledWith('cadastrosAccordion');
  });
});
