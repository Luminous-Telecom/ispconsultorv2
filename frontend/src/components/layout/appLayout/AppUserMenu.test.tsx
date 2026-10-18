import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { FontSizeProvider } from 'contexts/FontSizeContext';
import AppUserMenu from './AppUserMenu';

jest.mock('contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  }),
}));

function renderMenu() {
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
          onToggleUserMenu={jest.fn()}
          onLogout={jest.fn()}
          userTitleFallback="Usuário"
        />
      </FontSizeProvider>
    </I18nProvider>
  );
}

describe('AppUserMenu', () => {
  it('mostra tema, idioma e tamanho da fonte no menu', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'layout.theme' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.language' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSize' })).toBeTruthy();
  });

  it('abre o flyout de tamanho da fonte no clique', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'layout.fontSize' }));
    expect(screen.getByRole('button', { name: 'layout.fontSizeSmall' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSizeMedium' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'layout.fontSizeLarge' })).toBeTruthy();
  });
});
