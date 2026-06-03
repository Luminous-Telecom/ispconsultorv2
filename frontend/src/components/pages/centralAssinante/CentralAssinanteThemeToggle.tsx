import React from 'react';
import { useTheme } from 'contexts/ThemeContext';

const CentralAssinanteThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Modo escuro' : 'Modo claro';

  return (
    <button
      type="button"
      className="central-assinante-theme-toggle"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} aria-hidden="true"></i>
    </button>
  );
};

export default CentralAssinanteThemeToggle;
