import React from 'react';

interface ActionButton {
  label: string;
  action: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  icon?: string;
}

interface ActionButtonsProps {
  buttons: ActionButton[];
  selectedCount?: number;
  showSelectionCount?: boolean;
  className?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  buttons,
  selectedCount = 0,
  showSelectionCount = false,
  className = ''
}) => {
  const getVariantClass = (variant: string = 'primary') => {
    return `btn-${variant}`;
  };

  return (
    <div className={`d-flex align-items-center ${className}`} style={{ gap: '8px' }}>
      {/* Botões de ação */}
      <div className="d-flex" style={{ gap: '8px' }}>
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`btn btn-sm ${getVariantClass(button.variant)}`}
            onClick={button.action}
            disabled={button.disabled}
            style={{ flexShrink: 0 }}
            title={button.label}
          >
            {button.icon && <i className={`${button.icon} me-1`}></i>}
            {button.label}
          </button>
        ))}
      </div>

      {/* Contador de seleção */}
      {showSelectionCount && selectedCount > 0 && (
        <span className="text-muted small ms-2">
          {selectedCount} item(s) selecionado(s)
        </span>
      )}
    </div>
  );
};

export default ActionButtons;
