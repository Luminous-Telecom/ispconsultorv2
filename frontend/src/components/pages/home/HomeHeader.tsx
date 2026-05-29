import React from 'react';
import BackNetLogo from 'components/common/BackNetLogo';
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
      <button key={item.id} type="button" className="home-nav-link" onClick={() => scrollTo(item.id)}>
        {item.label}
      </button>
    ))}
    {SHOW_WIKI && (
      <a
        href="https://wiki.backnet.app/"
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
      <BackNetLogo width={120} height={38} className="home-logo" />
      <nav className="home-nav home-nav-desktop">
        <HomeNavLinks scrollTo={scrollTo} />
      </nav>
      <div className="home-header-actions">
        <button
          type="button"
          className="home-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        >
          <span className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} />
        </button>
        <button type="button" className="home-btn home-btn-accent" onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}>
          Acessar Sistema
        </button>
      </div>
      <button
        type="button"
        className="home-menu-toggle"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-expanded={isMenuOpen}
      >
        <span className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`} />
      </button>
    </div>
    {isMenuOpen && (
      <div className="home-nav-mobile">
        <HomeNavLinks scrollTo={scrollTo} onWikiClick={() => setIsMenuOpen(false)} />
        <button type="button" className="home-btn home-btn-accent home-btn-full" onClick={() => window.open('/login', '_blank', 'noopener,noreferrer')}>
          Acessar Sistema
        </button>
      </div>
    )}
  </header>
);

export default HomeHeader;
