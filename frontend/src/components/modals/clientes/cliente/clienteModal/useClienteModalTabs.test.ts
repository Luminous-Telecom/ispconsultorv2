import { renderHook } from '@testing-library/react';
import { useClienteModalTabs } from './useClienteModalTabs';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('abas do cliente', () => {
  it('oculta a aba Financeiro quando o perfil não vê a área financeira', () => {
    const { result } = renderHook(() =>
      useClienteModalTabs({
        canEditContratosFinanceiro: true,
        hasModuloEquipamentos: false,
        hasModuloRpki: false,
        showFinanceTabs: false,
      })
    );

    expect(result.current.some((tab) => tab.id === 'financeiro')).toBe(false);
    expect(result.current.some((tab) => tab.id === 'contratos')).toBe(true);
  });

  it('mantém a aba Financeiro para administrador e financeiro', () => {
    const { result } = renderHook(() =>
      useClienteModalTabs({
        canEditContratosFinanceiro: true,
        hasModuloEquipamentos: false,
        hasModuloRpki: false,
        showFinanceTabs: true,
      })
    );

    expect(result.current.some((tab) => tab.id === 'financeiro')).toBe(true);
  });
});
