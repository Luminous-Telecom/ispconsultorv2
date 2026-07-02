import React, { useState, useRef, useEffect } from 'react';
import { DropdownToggleButton, NavLinkButton } from 'components/ui';

interface DropdownItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

interface DropdownMenuProps {
  label: string;
  icon: string;
  items: DropdownItem[];
  isActive?: boolean;
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  label,
  icon,
  items,
  isActive = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={`dropdown-menu-container ${className}`} ref={dropdownRef}>
      <DropdownToggleButton isActive={isActive} onClick={handleToggle}>
        <i className={`bi ${icon}`}></i>
        <span className="flex-grow-1">{label}</span>
        <i className={`bi bi-chevron-down ms-auto dropdown-arrow ${isOpen ? 'open' : ''}`}></i>
      </DropdownToggleButton>

      {isOpen && (
        <div className="dropdown-content">
          {items.map((item) => (
            <NavLinkButton
              key={item.id}
              className={`dropdown-item d-flex align-items-center gap-2 ${item.disabled ? 'disabled opacity-50' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              ariaLabel={item.label}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </NavLinkButton>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
