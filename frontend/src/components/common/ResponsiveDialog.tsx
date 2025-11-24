import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui';

interface ResponsiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'a4';
  className?: string;
  headerActions?: React.ReactNode;
  modalId?: string;
}

/**
 * Componente interno que renderiza o conteúdo do diálogo.
 * Este componente deve ser filho de um TableHeaderProvider para ter seu próprio contexto.
 */
const ResponsiveDialogContent: React.FC<ResponsiveDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  headerActions,
}) => {
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
      className="responsive-dialog-mobile"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s ease',
      }}
    >
      {/* Header fixo com botão voltar */}
      <div
        className="d-flex align-items-center border-bottom"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          padding: '12px 16px',
          minHeight: '56px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          overflow: 'visible',
        }}
      >
        {/* Botão voltar */}
        <button
          type="button"
          className="btn btn-link p-0 me-3"
          onClick={onClose}
          style={{
            color: 'var(--text-primary)',
            textDecoration: 'none',
            border: 'none',
            background: 'none',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: '4px 8px',
            minWidth: '36px',
            width: 'auto', // Override global .btn width: 100% on mobile
            minHeight: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            flexShrink: 0,
            alignSelf: 'flex-start',
            marginTop: '2px',
          }}
          aria-label="Voltar"
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
          className="mb-0 text-truncate"
          style={{
            color: 'var(--text-primary)',
            fontSize: '0.8rem', // 12.8px - reduzido para mobile
            fontWeight: 600,
            margin: 0,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1, // Força o título a ocupar o espaço restante mas respeitando o shrink
            minWidth: 0, // Crítico para o truncate funcionar em flexbox
          }}
        >
          {title}
        </h5>

        {/* Menu de Ações (Três Pontos) */}
        {hasActions && (
          <div 
            className="d-flex align-items-center flex-shrink-0 position-relative" 
            ref={menuRef}
            style={{
              zIndex: 101,
            }}
          >
            <button
              type="button"
              className="btn btn-link p-0"
              onClick={() => setShowMenu(!showMenu)}
              style={{
                color: 'var(--text-primary)',
                border: 'none',
                background: 'none',
                fontSize: '1.25rem',
                minWidth: '36px',
                width: 'auto', // Override global .btn width: 100% on mobile
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
              }}
            >
              <i className="bi bi-three-dots-vertical"></i>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="dropdown-menu show"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.5rem)',
                  minWidth: '200px',
                  maxWidth: 'calc(100vw - 32px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  borderRadius: '0.5rem',
                  zIndex: 100001,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {/* Search Action */}
                {tableHeader.showSearch && (
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                    onClick={() => {
                      tableHeader.setShowMobileSearch(!tableHeader.showMobileSearch);
                      setShowMenu(false);
                    }}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="bi bi-search"></i>
                    <span>Buscar</span>
                  </button>
                )}

                {/* Reload Action */}
                {tableHeader.showReload && (
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                    onClick={() => {
                      if (tableHeader.onReloadClick) {
                        tableHeader.onReloadClick();
                      }
                      setShowMenu(false);
                    }}
                    disabled={tableHeader.loading}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span>Atualizar</span>
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
                              className="dropdown-item d-flex align-items-center gap-2 py-2"
                              disabled={isLoading || props.disabled}
                              style={{ color: 'var(--text-primary)' }}
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
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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
                            className="dropdown-item d-flex align-items-center gap-2 py-2"
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
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {isLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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
          className="p-2 border-bottom d-flex align-items-center gap-2 bg-light"
          style={{
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={tableHeader.searchPlaceholder}
            value={tableHeader.searchValue}
            onChange={(e) => tableHeader.setSearchValue(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-1"
            onClick={() => tableHeader.setShowMobileSearch(false)}
            style={{ width: 'auto' }} // Override global .btn width: 100%
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      {/* Conteúdo com scroll */}
      <div
        className={`responsive-dialog-mobile-content ${className}`}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: className?.includes('no-padding') ? 0 : '0.5rem',
          minHeight: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * ResponsiveDialog - Componente responsivo que adapta o comportamento baseado no dispositivo
 * 
 * Desktop (>= 768px): Renderiza como modal centralizado usando DraggableModal
 * Mobile (< 768px): Renderiza como página fullscreen com header fixo e botão voltar
 */
const ResponsiveDialog: React.FC<ResponsiveDialogProps> = (props) => {
  const isMobile = useIsMobile();

  // Se não for mobile, não renderizar (DraggableModal cuida do desktop)
  if (!isMobile) {
    return null;
  }

  // Se não estiver aberto, não renderizar
  if (!props.isOpen) {
    return null;
  }

  // Importante: Removemos o TableHeaderProvider isolado aqui.
  // Children passados para este componente consomem o contexto onde foram criados (Global/Layout).
  // Se criarmos um Provider novo aqui, a Table (children) continuará escrevendo no Global,
  // mas este componente lerá do Local (vazio), quebrando a comunicação.
  // Voltamos a usar o contexto Global. O conflito com o dashboard é mitigado pelo fato
  // de que a tabela do modal é montada por último.
  const mobileContent = (
    <ResponsiveDialogContent {...props} />
  );

  // Renderizar usando portal para garantir que apareça no nível raiz
  return ReactDOM.createPortal(mobileContent, document.body);
};

export default ResponsiveDialog;
