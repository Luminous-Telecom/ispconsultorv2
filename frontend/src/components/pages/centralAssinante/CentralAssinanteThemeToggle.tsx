import React from 'react';
import { IconOnlyButton } from 'components/ui';
import { useTheme } from 'contexts/ThemeContext';

const CentralAssinanteThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Modo escuro' : 'Modo claro';

  return (
    <IconOnlyButton
      className="central-assinante-theme-toggle"
      onClick={toggleTheme}
      title={label}
      label={label}
    >
      <i className={`bi ${theme === 'light' ? 'bi-moon' : 'bi-sun'}`} aria-hidden="true"></i>
    </IconOnlyButton>
  );
};

export default CentralAssinanteThemeToggle;
