import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PositionedFixed } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';

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

  // Fechar dropdown quando o idioma mudar
  useEffect(() => {
    setShowDropdown(false);
  }, [language]);

  // Calcular posição do dropdown
  const calculatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Para elementos com position: fixed, usar apenas a posição do viewport
      // O portal já está no body, então não precisamos adicionar scroll
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, []);

  // Abrir/fechar dropdown
  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!showDropdown) {
      calculatePosition();
    }
    setShowDropdown(!showDropdown);
  };

  // Fechar dropdown ao clicar fora e recalcular posição durante scroll/resize
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Não fechar se clicou no trigger ou no dropdown
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }

      setShowDropdown(false);
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    // Usar timeout para garantir que o onClick do botão seja processado primeiro
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showDropdown, calculatePosition]);

  const dropdownContent = (
    <ul className="table-dropdown-menu shadow position-absolute mt-1 dropdown-menu-min-w-160" >
      {availableLanguages.map((lang) => (
        <li key={lang.code}>
          <button
            className={`table-dropdown-item d-flex align-items-center w-100 dropdown-item-plain ${
              language === lang.code ? 'active' : ''
            }`}
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
        className="d-flex align-items-center justify-content-between w-100 cursor-pointer"
        onClick={handleToggleDropdown}
        
      >
        <div className="d-flex align-items-center gap-2">
          <span>
            {availableLanguages.find(lang => lang.code === language)?.flag}
          </span>
          <span>
            {availableLanguages.find(lang => lang.code === language)?.name}
          </span>
        </div>
        <i className="bi bi-chevron-down fs-sm opacity-60"></i>
      </div>
      {showDropdown && usePortal && createPortal(
        <PositionedFixed
          left={dropdownPosition.left}
          top={dropdownPosition.top}
          transform="translateZ(0)"
          className="language-dropdown-fixed-host"
        >
          <div ref={dropdownRef} data-language-dropdown>
            {dropdownContent}
          </div>
        </PositionedFixed>,
        document.body
      )}
      {showDropdown && !usePortal && (
        <div ref={dropdownRef} className="language-dropdown-absolute-host">
          {dropdownContent}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;