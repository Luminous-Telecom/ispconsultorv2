import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import ModalTabsOverflow from './ModalTabsOverflow';

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
  it('troca de aba apenas no clique', () => {
    const onTabChange = jest.fn();
    renderTabs(onTabChange);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Endereço' }));
    expect(onTabChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Endereço' }));
    expect(onTabChange).toHaveBeenCalledWith('b');
  });

  it('não troca de aba ao passar o mouse', () => {
    const onTabChange = jest.fn();
    renderTabs(onTabChange);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Endereço' }));
    expect(onTabChange).not.toHaveBeenCalled();
  });
});
