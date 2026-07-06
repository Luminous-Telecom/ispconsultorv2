import React from 'react';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import { AppButton, IconOnlyButton, NavLinkButton } from 'components/ui';
import { Theme } from 'contexts/ThemeContext';
import { NAV_ITEMS, WIKI_HOME_URL } from './homeConstants';

interface HomeHeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scrollTo: (id: string) => void;
}

const HomeNavLinks: React.FC<{
  scrollTo: (id: string) => void;
  onNavigate?: () => void;
}> = ({ scrollTo, onNavigate }) => (
  <>
    {NAV_ITEMS.map((item) => (
      <NavLinkButton
        key={item.id}
        type="button"
        className="home-nav-link"
        onClick={() => {
          scrollTo(item.id);
          onNavigate?.();
        }}
        ariaLabel={item.label}
      >
        {item.label}
      </NavLinkButton>
    ))}
    <a
      href={WIKI_HOME_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="home-nav-link home-nav-link-external"
      onClick={onNavigate}
    >
      Abrir wiki
      <span className="bi bi-box-arrow-up-right" aria-hidden />
    </a>
  </>
);

const HomeHeader: React.FC<HomeHeaderProps> = ({
  theme,
  toggleTheme,
  isMenuOpen,
  setIsMenuOpen,
  scrollTo,
}) => (
  <header className="home-header">
    <div className="home-header-inner">
      <IspConsultorLogo width={120} className="home-logo" />
      <nav className="home-nav-desktop" aria-label="Navegação principal">
        <HomeNavLinks scrollTo={scrollTo} />
      </nav>
      <div className="home-header-actions">
        <IconOnlyButton
          type="button"
          className="home-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          label={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        >
          <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
        </IconOnlyButton>
        <AppButton
          type="button"
          label="Acessar Sistema"
          variant="unstyled"
          className="home-btn home-btn-accent"
          onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}
        />
      </div>
      <IconOnlyButton
        type="button"
        className="home-menu-toggle"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-expanded={isMenuOpen}
        label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        <span className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
      </IconOnlyButton>
    </div>
    {isMenuOpen && (
      <nav className="home-nav-mobile" aria-label="Navegação mobile">
        <HomeNavLinks scrollTo={scrollTo} onNavigate={() => setIsMenuOpen(false)} />
        <div className="home-mobile-actions">
          <div className="home-mobile-theme-row">
            <span>Tema</span>
            <IconOnlyButton
              type="button"
              className="home-theme-toggle"
              onClick={toggleTheme}
              label={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
            >
              <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
            </IconOnlyButton>
          </div>
          <AppButton
            type="button"
            label="Acessar Sistema"
            variant="unstyled"
            className="home-btn home-btn-accent home-btn-full"
            onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}
          />
        </div>
      </nav>
    )}
  </header>
);

export default HomeHeader;
