import React from 'react';
import { render, screen } from '@testing-library/react';
import ContratoModalHeader from './ContratoModalHeader';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

function renderHeader(showFinanceTabs: boolean) {
  return render(
    <ContratoModalHeader
      isEditMode
      isMobile
      activeTab="contrato"
      isSubmitting={false}
      showFinanceTabs={showFinanceTabs}
      onClose={jest.fn()}
      onPrintContract={jest.fn()}
      onTabChange={jest.fn()}
    />
  );
}

describe('abas do contrato', () => {
  it('mostra Financeiro e Financeiro Avulso para quem vê a área financeira', () => {
    renderHeader(true);
    expect(screen.getAllByText('tabs.financial').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tabs.financialMisc').length).toBeGreaterThan(0);
  });

  it('oculta Financeiro e Financeiro Avulso do perfil usuário', () => {
    renderHeader(false);
    expect(screen.queryByText('tabs.financial')).toBeNull();
    expect(screen.queryByText('tabs.financialMisc')).toBeNull();
    expect(screen.getAllByText('tabs.contractData').length).toBeGreaterThan(0);
  });
});
