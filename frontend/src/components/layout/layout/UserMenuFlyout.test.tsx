import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import UserMenuFlyout from './UserMenuFlyout';

function renderFlyout(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('UserMenuFlyout', () => {
  it('abre o submenu com opções ao clicar', () => {
    const onSelect = jest.fn();
    renderFlyout(
      <ul className="layout-user-dropdown">
        <UserMenuFlyout
          label="Tema"
          iconClassName="bi bi-circle-half"
          ariaLabel="Tema"
          options={[
            { id: 'light', label: 'Modo Claro', active: true, onSelect },
            { id: 'dark', label: 'Modo Escuro', onSelect: jest.fn() },
          ]}
        />
      </ul>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tema' }));
    expect(screen.getByRole('button', { name: 'Modo Claro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Modo Escuro' })).toBeTruthy();
  });

  it('posiciona o flyout com folga à esquerda do painel do menu', () => {
    renderFlyout(
      <ul className="layout-user-dropdown">
        <UserMenuFlyout
          label="Tema"
          iconClassName="bi bi-circle-half"
          ariaLabel="Tema"
          options={[{ id: 'light', label: 'Modo Claro', onSelect: jest.fn() }]}
        />
      </ul>
    );

    const panel = document.querySelector('.layout-user-dropdown') as HTMLElement;
    const item = panel.querySelector('.layout-user-dropdown__flyout-item') as HTMLElement;

    panel.getBoundingClientRect = () =>
      ({
        left: 300,
        right: 500,
        top: 80,
        bottom: 280,
        width: 200,
        height: 200,
        x: 300,
        y: 80,
        toJSON: () => ({}),
      }) as DOMRect;

    item.getBoundingClientRect = () =>
      ({
        left: 308,
        right: 492,
        top: 140,
        bottom: 176,
        width: 184,
        height: 36,
        x: 308,
        y: 140,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.click(screen.getByRole('button', { name: 'Tema' }));

    const flyout = document.querySelector('[data-user-menu-flyout]') as HTMLElement;
    expect(flyout).toBeTruthy();
    Object.defineProperty(flyout, 'offsetWidth', { configurable: true, value: 140 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const left = Number.parseFloat(flyout.style.left || '0');
    // painel.left (300) - largura (140) - gap (8) = 152
    expect(left).toBe(152);
  });
});
