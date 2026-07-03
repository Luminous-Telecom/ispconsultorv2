import React from 'react';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import { AppButton, IconOnlyButton, NavLinkButton } from 'components/ui';
import { Theme } from 'contexts/ThemeContext';
import { NAV_ITEMS, SHOW_WIKI } from './homeConstants';

interface HomeHeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scrollTo: (id: string) => void;
}

const HomeNavLinks: React.FC<{
  scrollTo: (id: string) => void;
  onWikiClick?: () => void;
}> = ({ scrollTo, onWikiClick }) => (
  <>
    {NAV_ITEMS.map((item) => (
      <NavLinkButton
        key={item.id}
        type="button"
        className="home-nav-link"
        onClick={() => scrollTo(item.id)}
        ariaLabel={item.label}
      >
        {item.label}
      </NavLinkButton>
    ))}
    {SHOW_WIKI && (
      <a
        href="https://wiki.ispconsultor.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="home-nav-link home-nav-link-external"
        onClick={onWikiClick}
      >
        Wiki
      </a>
    )}
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
      <nav className="home-nav home-nav-desktop">
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
      <div className="home-nav-mobile">
        <HomeNavLinks scrollTo={scrollTo} onWikiClick={() => setIsMenuOpen(false)} />
        <AppButton
          type="button"
          label="Acessar Sistema"
          variant="unstyled"
          className="home-btn home-btn-accent home-btn-full"
          onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}
        />
      </div>
    )}
  </header>
);

export default HomeHeader;
