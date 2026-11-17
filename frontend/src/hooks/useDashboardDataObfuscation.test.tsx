import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useDashboardDataObfuscation } from './useDashboardDataObfuscation';

const STORAGE_KEY = 'dashboard-data-obfuscated';

function Probe() {
  const { isObfuscated, toggle } = useDashboardDataObfuscation();
  return (
    <button type="button" aria-pressed={isObfuscated} onClick={toggle}>
      alternar
    </button>
  );
}

describe('useDashboardDataObfuscation', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('começa visível e passa a ofuscar ao alternar', () => {
    render(<Probe />);
    const button = screen.getByRole('button', { name: 'alternar' });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('lê a preferência já salva', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    render(<Probe />);
    expect(screen.getByRole('button', { name: 'alternar' }).getAttribute('aria-pressed')).toBe('true');
  });
});
