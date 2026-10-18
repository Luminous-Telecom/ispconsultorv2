import React from 'react';
import { render, screen } from '@testing-library/react';
import { SYSTEM_NAME } from 'constants/systemBrand';
import { I18nProvider } from 'contexts/I18nContext';
import AppLayoutHeader from './AppLayoutHeader';

jest.mock('../layout/TopNavMenu', () => () => null);
jest.mock('./AppUserMenu', () => () => <div data-testid="user-menu" />);
jest.mock('../layout/LayoutSearchBar', () => () => <div data-testid="search-bar" />);

describe('AppLayoutHeader', () => {
  const noop = jest.fn();

  const renderHeader = (isMobile: boolean) => {
    localStorage.setItem('app-language', 'pt-BR');
    return render(
      <I18nProvider>
        <AppLayoutHeader
          isMobile={isMobile}
          currentUser={null}
          showUserMenu={false}
          theme="light"
          searchValue=""
          setSearchValue={noop}
          userMenuRef={{ current: null }}
          t={(key) => key}
          onToggleSidebar={noop}
          onToggleUserMenu={noop}
          onToggleTheme={noop}
          onLogout={noop}
          onSearch={noop}
          searchBarIdPrefix="app"
          menuAriaLabel="Abrir menu"
          userTitleFallback="Usuário"
        />
      </I18nProvider>
    );
  };

  it('mostra a logo do sistema antes da barra de pesquisa no desktop', () => {
    renderHeader(false);

    const logo = screen.getByRole('img', { name: `${SYSTEM_NAME} Logo` });
    const search = screen.getByTestId('search-bar');
    expect(logo.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('não mostra a logo no mobile', () => {
    renderHeader(true);
    expect(screen.queryByRole('img', { name: `${SYSTEM_NAME} Logo` })).toBeNull();
  });
});
