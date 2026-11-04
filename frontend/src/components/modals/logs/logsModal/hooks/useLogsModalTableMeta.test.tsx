import React from 'react';
import { renderHook } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import { useLogsModalTableMeta } from './useLogsModalTableMeta';

function renderMeta(isBlockdomiApi: boolean, setCadastrarIp: (ip: string | null) => void) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </I18nProvider>
  );
  return renderHook(
    () =>
      useLogsModalTableMeta({
        ctx: {
          tableFilters: {
            setSearch: jest.fn(),
            setSearchField: jest.fn(),
            setPage: jest.fn(),
            page: 1,
            limit: 15,
          },
          setFilterStartDate: jest.fn(),
          setFilterEndDate: jest.fn(),
          refetch: jest.fn(),
        } as never,
        data: { data: [] },
        isEquipamentos: false,
        isEquipamentosOuAgentes: false,
        isAuditoria: false,
        isEmail: false,
        isBlockdomiApi,
        setShowBlockdomiLogsReal: jest.fn(),
        setWhoisIp: jest.fn(),
        setCadastrarIp,
        selectedItem: null,
        handleViewDetails: jest.fn(),
        canal: null,
        incluirErp: false,
      }),
    { wrapper }
  );
}

describe('useLogsModalTableMeta — cadastrar IP do log', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'pt-BR');
  });

  it('abre o cadastro com o IP da linha selecionada', () => {
    const setCadastrarIp = jest.fn();
    const { result } = renderMeta(true, setCadastrarIp);
    const cadastrar = result.current.bulkActions.find((action) => action.label === 'Cadastrar IP');
    expect(cadastrar).toBeTruthy();
    const isDisabled = cadastrar?.disabled as (items: unknown[]) => boolean;
    expect(isDisabled([])).toBe(true);
    expect(isDisabled([{ id: 1, ip: '  ' }])).toBe(true);
    cadastrar?.action([{ id: 1, ip: ' 203.0.113.10 ' }]);
    expect(setCadastrarIp).toHaveBeenCalledWith('203.0.113.10');
  });

  it('não mostra Cadastrar IP nos outros logs', () => {
    const { result } = renderMeta(false, jest.fn());
    expect(result.current.bulkActions.some((action) => action.label === 'Cadastrar IP')).toBe(false);
  });
});
