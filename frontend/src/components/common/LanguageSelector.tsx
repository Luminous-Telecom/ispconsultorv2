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
    <ul className="table-dropdown-menu shadow position-absolute mt-1" style={{ minWidth: '160px' }}>
      {availableLanguages.map((lang) => (
        <li key={lang.code}>
          <button
            className={`table-dropdown-item d-flex align-items-center w-100 ${
              language === lang.code ? 'active' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (language !== lang.code) {
                setLanguage(lang.code);
              }
              // Usar setTimeout para garantir que o setLanguage seja processado antes de fechar
              setTimeout(() => {
                setShowDropdown(false);
              }, 0);
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
      {showDropdown && usePortal && createPortal(
        <div
          ref={dropdownRef}
          data-language-dropdown
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 99999,
            transform: 'translateZ(0)', // Forçar novo stacking context
            willChange: 'transform' // Otimização de performance
          }}
        >
          {dropdownContent}
        </div>,
        document.body
      )}
      {showDropdown && !usePortal && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 99999
          }}
        >
          {dropdownContent}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;