import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import TopNavMenu from './TopNavMenu';
import type { SidebarFolderConfig } from './types';

const openClientes = jest.fn();

const folders: SidebarFolderConfig[] = [
  {
    accordionId: 'cadastrosAccordion',
    collapseId: 'cadastrosCollapse',
    headingId: 'cadastrosHeading',
    title: 'Cadastros',
    items: [
      {
        id: 'clientes',
        modalId: 'clientes',
        label: 'Clientes',
        icon: 'bi-people',
        onClick: openClientes,
      },
    ],
  },
];

jest.mock('contexts/ModalContext', () => ({
  useModal: () => ({
    activeModal: null,
    modalData: null,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  }),
}));

jest.mock('hooks/usePrefersRealHover', () => ({
  usePrefersRealHover: () => false,
}));

describe('TopNavMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('app-language', 'pt-BR');
  });

  it('abre o dropdown no clique e dispara a opção', () => {
    render(
      <I18nProvider>
        <TopNavMenu folders={folders} isLoadingModulos={false} t={(key) => key} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cadastros' }));
    expect(screen.getByRole('button', { name: 'Clientes' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));
    expect(openClientes).toHaveBeenCalledTimes(1);
  });
});
