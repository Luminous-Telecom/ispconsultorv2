import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Button, Spinner } from '@/components/ui';
import SearchBar from '@/components/ui/SearchBar';
import { useI18n } from '@/contexts/I18nContext';

interface ResponsiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'a4';
  className?: string;
  headerActions?: React.ReactNode;
  modalId?: string;
  isLoading?: boolean;
}

const ResponsiveDialogContent: React.FC<ResponsiveDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  headerActions,
  isLoading: _isLoading = false, // Mantido para compatibilidade, mas não usado
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const tableHeader = useTableHeader();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prevenir scroll do body quando dialog estiver aberto
  useEffect(() => {
    if (isOpen && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMobile]);

  // Handler para tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!isOpen) return null;

  const hasActions = tableHeader.showSearch || tableHeader.showReload || headerActions;

  return (
    <div
      className="responsive-dialog-mobile responsive-dialog-mobile-custom"
    >
      {/* Header fixo com botão voltar */}
      <div
        className="d-flex align-items-center border-bottom responsive-dialog-header-custom"
      >
        {/* Botão voltar */}
        <button
          type="button"
          className="btn btn-link p-0 me-3 responsive-dialog-back-btn responsive-dialog-btn-auto"
          onClick={onClose}
          aria-label={t('buttons.back')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Título */}
        <h5
          className="mb-0 text-truncate responsive-dialog-title-custom"
        >
          {title}
        </h5>

        {/* Menu de Ações (Três Pontos) */}
        {hasActions && (
          <div
            className="d-flex align-items-center flex-shrink-0 position-relative responsive-dialog-menu-container"
            ref={menuRef}
          >
            <button
              type="button"
              className="btn btn-link p-0 responsive-dialog-menu-btn responsive-dialog-btn-auto"
              onClick={() => setShowMenu(!showMenu)}
            >
              <i className="bi bi-three-dots-vertical"></i>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="dropdown-menu show responsive-dialog-menu-dropdown"
                style={{
                  top: 'calc(100% + 0.5rem)',
                  minWidth: '200px',
                  maxWidth: 'calc(100vw - 32px)',
                  zIndex: 100001,
                }}
              >
                {/* Search Action */}
                {tableHeader.showSearch && (
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                    onClick={() => {
                      tableHeader.setShowMobileSearch(!tableHeader.showMobileSearch);
                      setShowMenu(false);
                    }}
                  >
                    <i className="bi bi-search"></i>
                    <span>{t('buttons.search')}</span>
                  </button>
                )}

                {/* Reload Action */}
                {tableHeader.showReload && (
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                    onClick={() => {
                      if (tableHeader.onReloadClick) {
                        tableHeader.onReloadClick();
                      }
                      setShowMenu(false);
                    }}
                    disabled={tableHeader.loading}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span>{t('buttons.reload')}</span>
                  </button>
                )}

                {/* Header Actions Customizados - Renderizar como dropdown-items */}
                {headerActions && (
                  <>
                    <div className="dropdown-divider"></div>
                    {React.Children.map(headerActions, (child) => {
                      if (!React.isValidElement(child)) return child;
                      
                      // Função helper para renderizar Button como dropdown-item
                      const renderButtonAsDropdownItem = (buttonChild: React.ReactElement) => {
                        const props = buttonChild.props as {
                          leftIcon?: React.ReactNode;
                          icon?: string;
                          isLoading?: boolean;
                          disabled?: boolean;
                          onClick?: (e: React.MouseEvent | React.FormEvent) => void;
                          type?: string;
                          form?: string;
                          children?: React.ReactNode;
                          key?: string | number;
                        };
                        
                        const leftIcon = props.leftIcon || (props.icon ? <i className={`bi bi-${props.icon}`}></i> : null);
                        const isLoading = props.isLoading || false;
                        const buttonType = (props.type as 'button' | 'submit' | 'reset') || 'button';
                        
                        // Se for type="submit" com form, usar o comportamento nativo do formulário
                        if (buttonType === 'submit' && props.form) {
                          return (
                            <button
                              key={props.key || Math.random()}
                              type="submit"
                              form={props.form}
                              className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                              disabled={isLoading || props.disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Fechar o menu após processar o evento
                                setTimeout(() => {
                                  setShowMenu(false);
                                }, 0);
                              }}
                            >
                              {isLoading ? (
                                <>
                                  <Spinner size="sm" variant="primary" className="me-2" />
                                  <span>{props.children}</span>
                                </>
                              ) : (
                                <>
                                  {leftIcon}
                                  <span>{props.children}</span>
                                </>
                              )}
                            </button>
                          );
                        }
                        
                        // Para type="button" com onClick, passar o evento diretamente
                        return (
                          <button
                            key={props.key || Math.random()}
                            type={buttonType}
                            className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Processar o evento antes de fechar o menu
                              if (props.onClick && !isLoading && !props.disabled) {
                                // Passar o evento diretamente - handleSubmit aceita qualquer evento com preventDefault
                                props.onClick(e as React.MouseEvent & React.FormEvent);
                              }
                              // Fechar o menu após processar o evento
                              setTimeout(() => {
                                setShowMenu(false);
                              }, 0);
                            }}
                            disabled={isLoading || props.disabled}
                          >
                            {isLoading ? (
                              <>
                                <Spinner size="sm" variant="primary" className="me-2" />
                                <span>{props.children}</span>
                              </>
                            ) : (
                              <>
                                {leftIcon}
                                <span>{props.children}</span>
                              </>
                            )}
                          </button>
                        );
                      };
                      
                      // Se for um Button component, renderizar como dropdown-item
                      if (child.type === Button) {
                        return renderButtonAsDropdownItem(child);
                      }
                      
                      // Se for um div com botões dentro, processar cada botão
                      if (child.type === 'div') {
                        const divProps = child.props as { children?: React.ReactNode };
                        if (divProps.children) {
                          return React.Children.map(divProps.children, (buttonChild) => {
                            if (!React.isValidElement(buttonChild)) return buttonChild;
                            
                            if (buttonChild.type === Button) {
                              return renderButtonAsDropdownItem(buttonChild);
                            }
                            
                            return buttonChild;
                          });
                        }
                      }
                      
                      return child;
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Search Field (expandable) */}
      {tableHeader.showMobileSearch && tableHeader.showSearch && (
        <div
          className="p-2 border-bottom d-flex align-items-center gap-2 bg-light responsive-dialog-mobile-search"
        >
          <SearchBar
            id="responsive-dialog-mobile-search"
            variant="mobile"
            value={tableHeader.searchValue}
            onChange={tableHeader.setSearchValue}
            onSearch={(value) => tableHeader.onSearchClick?.(value)}
            placeholder={tableHeader.searchPlaceholder}
            searchField={tableHeader.searchField}
            onSearchFieldChange={tableHeader.setSearchField}
            searchFields={tableHeader.availableSearchFields}
            className="flex-grow-1"
          />
          <button
            type="button"
            className="btn btn-sm btn-link text-primary p-1 responsive-dialog-btn-auto"
            onClick={() => tableHeader.setShowMobileSearch(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      {/* Conteúdo com scroll */}
      <div
        className={`responsive-dialog-mobile-content responsive-dialog-content-custom ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          padding: className?.includes('no-padding') ? 0 : '0.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ResponsiveDialog: React.FC<ResponsiveDialogProps> = (props) => {
  const isMobile = useIsMobile();

  if (!isMobile || !props.isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <ResponsiveDialogContent {...props} />,
    document.body
  );
};

export default ResponsiveDialog;
