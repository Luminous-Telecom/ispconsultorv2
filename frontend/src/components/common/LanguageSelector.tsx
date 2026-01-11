import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/contexts/I18nContext';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface LanguageSelectorProps {
  usePortal?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ usePortal = true }) => {
  const { language, setLanguage, availableLanguages } = useI18n();
  const isMobile = useIsMobile();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posição do dropdown
  const calculatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };

  // Abrir/fechar dropdown
  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showDropdown) {
      calculatePosition();
    }
    setShowDropdown(!showDropdown);
  };

  // Fechar dropdown ao clicar fora
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;

    // Não fechar se clicou em um botão do dropdown
    if (target && target.closest('.table-dropdown-item')) {
      return;
    }

    const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
    const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

    if (isOutsideTrigger && isOutsideDropdown) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, handleClickOutside]);

  const dropdownContent = (
    <ul className="table-dropdown-menu shadow position-absolute mt-1" style={{ minWidth: '160px' }}>
      {availableLanguages.map((lang) => (
        <li key={lang.code}>
          <button
            className={`table-dropdown-item d-flex align-items-center w-100 ${
              language === lang.code ? 'active' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setLanguage(lang.code);
              setShowDropdown(false);
            }}
            style={{ border: 'none', background: 'none' }}
          >
            <span className="me-2">{lang.flag}</span>
            <span>{lang.name}</span>
            {(language === lang.code && isMobile) && (
              <i className="bi bi-check-lg ms-auto text-primary"></i>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="position-relative" ref={triggerRef}>
      <div
        className="d-flex align-items-center justify-content-between w-100"
        onClick={handleToggleDropdown}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span>
            {availableLanguages.find(lang => lang.code === language)?.flag}
          </span>
          <span>
            {availableLanguages.find(lang => lang.code === language)?.name}
          </span>
        </div>
        <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.6 }}></i>
      </div>
      {usePortal && createPortal(
        showDropdown && (
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top + 4}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 10000,
              pointerEvents: 'auto'
            }}
          >
            {dropdownContent}
          </div>
        ),
        document.body
      )}
    </div>
  );
};

export default LanguageSelector;