import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import ModalTabsOverflow, { MODAL_TAB_HOVER_DELAY_MS } from './ModalTabsOverflow';

jest.mock('hooks/usePrefersRealHover', () => ({
  usePrefersRealHover: () => true,
}));

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const tabs = [
  { id: 'a', label: 'Principal' },
  { id: 'b', label: 'Endereço' },
];

function renderTabs(onTabChange: jest.Mock, activeTab: string = 'a') {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <ModalTabsOverflow tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
    </I18nProvider>
  );
}

describe('ModalTabsOverflow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('troca de aba ao passar o mouse após o atraso do menu', () => {
    const onTabChange = jest.fn();
    renderTabs(onTabChange);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Endereço' }));
    expect(onTabChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(MODAL_TAB_HOVER_DELAY_MS);
    });

    expect(onTabChange).toHaveBeenCalledWith('b');
  });

  it('cancela a troca se o mouse sair antes do atraso', () => {
    const onTabChange = jest.fn();
    renderTabs(onTabChange);

    const tab = screen.getByRole('button', { name: 'Endereço' });
    fireEvent.mouseEnter(tab);
    fireEvent.mouseLeave(tab);

    act(() => {
      jest.advanceTimersByTime(MODAL_TAB_HOVER_DELAY_MS);
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('mantém clique imediato para trocar de aba', () => {
    const onTabChange = jest.fn();
    renderTabs(onTabChange);

    fireEvent.click(screen.getByRole('button', { name: 'Endereço' }));
    expect(onTabChange).toHaveBeenCalledWith('b');
  });
});
