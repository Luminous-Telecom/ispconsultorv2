import React from 'react';

export interface InfoHelpIconProps {
  text: string;
  className?: string;
}

/**
 * Ícone de ajuda padrão do sistema (Bootstrap Icons), igual a FormField/Checkbox.
 */
export const InfoHelpIcon: React.FC<InfoHelpIconProps> = ({ text, className = 'ms-1' }) => (
  <i
    className={`bi bi-info-circle text-muted flex-shrink-0 ${className}`.trim()}
    style={{ cursor: 'help', fontSize: '0.85rem' }}
    title={text}
    role="img"
    aria-label={text}
  />
);
