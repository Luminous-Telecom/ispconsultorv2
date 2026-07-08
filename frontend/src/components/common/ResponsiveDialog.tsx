import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { RecarregarButton, Loading, VoltarButton, IconOnlyButton, NavLinkButton } from 'components/ui';
import SearchBar from 'components/ui/SearchBar';
import { useI18n } from 'contexts/I18nContext';

function isActionButtonComponent(type: unknown): boolean {
  if (typeof type === 'function') {
    const displayName = (type as React.FC).displayName;
    return !!displayName && displayName.endsWith('Button') && displayName !== 'Button';
  }
  return false;
}

interface UnifiedModalHeaderParts {
  buttons: React.ReactNode;
  tabs: React.ReactNode;
}

/** Separa botões e abas do header unificado dos modais com tabs (Cliente, Contrato, etc.). */
function parseUnifiedModalHeader(headerActions: React.ReactNode): UnifiedModalHeaderParts | null {
  if (!React.isValidElement(headerActions)) return null;

  const props = headerActions.props as { className?: string; children?: React.ReactNode };
  const className = props.className ?? '';
  if (!className.includes('-header-unified')) return null;

  let buttons: React.ReactNode = null;
  let tabs: React.ReactNode = null;

  React.Children.forEach(props.children, (child) => {
    if (!React.isValidElement(child)) return;
    const childClass = (child.props as { className?: string }).className ?? '';
    if (childClass.includes('-header-buttons') || childClass.includes('modal-header-actions')) {
      buttons = child;
    } else if (childClass.includes('-header-tabs')) {
      tabs = child;
    }
  });

  if (!tabs) return null;
  return { buttons, tabs };
}

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

  const unifiedHeader = headerActions ? parseUnifiedModalHeader(headerActions) : null;
  const menuHeaderActions = unifiedHeader?.buttons ?? headerActions;
  const hasActions =
    tableHeader.showSearch || tableHeader.showReload || Boolean(menuHeaderActions);

  return (
    <div
      className="responsive-dialog-mobile responsive-dialog-mobile-custom"
    >
      {/* Header fixo com botão voltar */}
      <div
        className="d-flex align-items-center border-bottom responsive-dialog-header-custom"
      >
        {/* Botão voltar */}
        <VoltarButton
          type="button"
          variant="ghost"
          className="p-0 me-3 responsive-dialog-back-btn responsive-dialog-btn-auto"
          onClick={onClose}
        />

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
            <IconOnlyButton
              type="button"
              variant="ghost"
              className="p-0 responsive-dialog-menu-btn responsive-dialog-btn-auto"
              onClick={() => setShowMenu(!showMenu)}
              label={t('layout.openMenu')}
            >
              <i className="bi bi-three-dots-vertical" aria-hidden />
            </IconOnlyButton>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="dropdown-menu show responsive-dialog-menu-dropdown responsive-dialog-menu-dropdown-position"
              >
                {/* Search Action */}
                {tableHeader.showSearch && (
                  <NavLinkButton
                    className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                    onClick={() => {
                      tableHeader.setShowMobileSearch(!tableHeader.showMobileSearch);
                      setShowMenu(false);
                    }}
                    ariaLabel={t('buttons.search')}
                  >
                    <i className="bi bi-search"></i>
                    <span>{t('buttons.search')}</span>
                  </NavLinkButton>
                )}

                {/* Reload Action */}
                {tableHeader.showReload && (
                  <RecarregarButton
                    type="button"
                    className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary border-0 bg-transparent w-100 text-start"
                    onClick={() => {
                      if (tableHeader.onReloadClick) {
                        tableHeader.onReloadClick();
                      }
                      setShowMenu(false);
                    }}
                    disabled={tableHeader.loading}
                    isPending={tableHeader.loading}
                  />
                )}

                {/* Header Actions Customizados - Renderizar como dropdown-items */}
                {menuHeaderActions && (
                  <>
                    <div className="dropdown-divider"></div>
                    {React.Children.map(menuHeaderActions, (child) => {
                      if (!React.isValidElement(child)) return child;
                      
                      // Função helper para renderizar Button como dropdown-item
                      const renderButtonAsDropdownItem = (buttonChild: React.ReactElement) => {
                        const props = buttonChild.props as {
                          leftIcon?: React.ReactNode;
                          icon?: string;
                          isLoading?: boolean;
                          isPending?: boolean;
                          disabled?: boolean;
                          onClick?: (e: React.MouseEvent | React.FormEvent) => void;
                          type?: string;
                          form?: string;
                          children?: React.ReactNode;
                          className?: string;
                          key?: string | number;
                        };

                        if (isActionButtonComponent(buttonChild.type)) {
                          return (
                            <div
                              key={props.key || Math.random()}
                              className="dropdown-item p-1 border-0 bg-transparent"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {React.cloneElement(
                                buttonChild as React.ReactElement<{
                                  className?: string;
                                  onClick?: (e: React.MouseEvent) => void;
                                }>,
                                {
                                  className: [props.className, 'w-100'].filter(Boolean).join(' '),
                                  onClick: (e: React.MouseEvent) => {
                                    props.onClick?.(e);
                                    setTimeout(() => setShowMenu(false), 0);
                                  },
                                }
                              )}
                            </div>
                          );
                        }
                        
                        const leftIcon = props.leftIcon || (props.icon ? <i className={`bi bi-${props.icon}`}></i> : null);
                        const isLoading = props.isLoading || props.isPending || false;
                        const buttonType = (props.type as 'button' | 'submit' | 'reset') || 'button';
                        
                        // Se for type="submit" com form, usar o comportamento nativo do formulário
                        if (buttonType === 'submit' && props.form) {
                          return (
                            <NavLinkButton
                              key={props.key || Math.random()}
                              type="submit"
                              form={props.form}
                              className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                              disabled={isLoading || props.disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeout(() => {
                                  setShowMenu(false);
                                }, 0);
                              }}
                              ariaLabel={typeof props.children === 'string' ? props.children : 'Enviar'}
                            >
                              {isLoading ? (
                                <>
                                  <Loading variant="inline" size="sm" className="me-2" showMessage={false} />
                                  <span>{props.children}</span>
                                </>
                              ) : (
                                <>
                                  {leftIcon}
                                  <span>{props.children}</span>
                                </>
                              )}
                            </NavLinkButton>
                          );
                        }

                        return (
                          <NavLinkButton
                            key={props.key || Math.random()}
                            type={buttonType}
                            className="dropdown-item d-flex align-items-center gap-2 py-2 responsive-dialog-text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (props.onClick && !isLoading && !props.disabled) {
                                props.onClick(e as React.MouseEvent & React.FormEvent);
                              }
                              setTimeout(() => {
                                setShowMenu(false);
                              }, 0);
                            }}
                            disabled={isLoading || props.disabled}
                            ariaLabel={typeof props.children === 'string' ? props.children : 'Ação'}
                          >
                            {isLoading ? (
                              <>
                                <Loading variant="inline" size="sm" className="me-2" showMessage={false} />
                                <span>{props.children}</span>
                              </>
                            ) : (
                              <>
                                {leftIcon}
                                <span>{props.children}</span>
                              </>
                            )}
                          </NavLinkButton>
                        );
                      };
                      
                      // Se for um Button component, renderizar como dropdown-item
                      if (isActionButtonComponent(child.type)) {
                        return renderButtonAsDropdownItem(child);
                      }
                      
                      // Se for um div com botões dentro, processar cada botão
                      if (child.type === 'div') {
                        const divProps = child.props as { children?: React.ReactNode };
                        if (divProps.children) {
                          return React.Children.map(divProps.children, (buttonChild) => {
                            if (!React.isValidElement(buttonChild)) return buttonChild;
                            
                            if (isActionButtonComponent(buttonChild.type)) {
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

      {/* Abas visíveis abaixo do header (modais com header unificado) */}
      {unifiedHeader?.tabs && (
        <div className="responsive-dialog-tabs-bar">{unifiedHeader.tabs}</div>
      )}

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
          <IconOnlyButton
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary p-1 responsive-dialog-btn-auto"
            onClick={() => tableHeader.setShowMobileSearch(false)}
            label={t('actions.cancel')}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </IconOnlyButton>
        </div>
      )}

      {/* Conteúdo com scroll */}
      <div
        className={`responsive-dialog-mobile-content responsive-dialog-content-custom ${className?.includes('no-padding') ? 'responsive-dialog-content-no-padding' : ''} ${className ?? ''}`}
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
