import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { FontSizeProvider } from 'contexts/FontSizeContext';
import AppUserMenu from './AppUserMenu';

const mockOpenModal = jest.fn();

jest.mock('contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('contexts/ModalContext', () => ({
  useModal: () => ({
    openModal: mockOpenModal,
    closeModal: jest.fn(),
    activeModal: null,
    modalData: null,
  }),
}));

function renderMenu(onToggleUserMenu = jest.fn()) {
  localStorage.setItem('app-language', 'pt-BR');
  const userMenuRef = { current: null as HTMLDivElement | null };
  return render(
    <I18nProvider>
      <FontSizeProvider>
        <AppUserMenu
          currentUser={{ nome: 'Ana', email: 'ana@test.com' }}
          showUserMenu
          userMenuRef={userMenuRef}
          t={(key) => key}
          onToggleUserMenu={onToggleUserMenu}
          onLogout={jest.fn()}
          userTitleFallback="Usuário"
        />
      </FontSizeProvider>
    </I18nProvider>
  );
}

describe('AppUserMenu', () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
  });

  it('mostra tema, tamanho da fonte, conf do usuário e logout', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'layout.theme' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSize' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.userConfig' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'nav.logout' })).toBeTruthy();
  });

  it('abre o flyout de tamanho da fonte no clique', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'layout.fontSize' }));
    expect(screen.getByRole('button', { name: 'layout.fontSizeSmall' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSizeMedium' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSizeLarge' })).toBeTruthy();
  });

  it('abre o modal conf-usuario ao clicar', () => {
    const onToggleUserMenu = jest.fn();
    renderMenu(onToggleUserMenu);
    fireEvent.click(screen.getByRole('button', { name: 'layout.userConfig' }));
    expect(onToggleUserMenu).toHaveBeenCalled();
    expect(mockOpenModal).toHaveBeenCalledWith('conf-usuario');
  });
});
