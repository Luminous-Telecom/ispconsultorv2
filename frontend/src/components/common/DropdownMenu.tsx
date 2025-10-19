import React, { useState, useRef, useEffect } from 'react';

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
      <button
        className={`sidebar-nav-link dropdown-toggle ${isActive ? 'active' : ''}`}
        onClick={handleToggle}
        type="button"
      >
        <i className={`bi ${icon}`}></i>
        <span>{label}</span>
        <i className={`bi bi-chevron-down dropdown-arrow ${isOpen ? 'open' : ''}`}></i>
      </button>
      
      {isOpen && (
        <div className="dropdown-content">
          {items.map((item) => (
            <button
              key={item.id}
              className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
