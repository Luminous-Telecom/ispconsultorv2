import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPrivacyFrame from './DashboardPrivacyFrame';

const STORAGE_KEY = 'dashboard-data-obfuscated';

describe('DashboardPrivacyFrame', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('mostra os dados quando a preferência está desligada', () => {
    render(
      <DashboardPrivacyFrame>
        <span>R$ 1.250,00</span>
      </DashboardPrivacyFrame>
    );
    expect(screen.getByText('R$ 1.250,00')).toBeTruthy();
    const container = document.querySelector('.dashboard-container');
    expect(container?.classList.contains('dashboard-container--obfuscated')).toBe(false);
    expect(container?.getAttribute('aria-hidden')).toBeNull();
    expect(container?.querySelector(':scope > .container-fluid, :scope > span')).toBeTruthy();
  });

  it('embaça os dados quando a preferência está salva', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    render(
      <DashboardPrivacyFrame>
        <div className="container-fluid">R$ 1.250,00</div>
      </DashboardPrivacyFrame>
    );
    const container = document.querySelector('.dashboard-container');
    expect(container?.classList.contains('dashboard-container--obfuscated')).toBe(true);
    expect(container?.getAttribute('aria-hidden')).toBe('true');
    expect(container?.querySelector(':scope > .container-fluid')).toBeTruthy();
  });
});
