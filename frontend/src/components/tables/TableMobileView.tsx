import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TranslationKeys } from 'contexts/I18nContext';
import Spinner from '../ui/Spinner';
import { drainPossiblePromise } from './tableUtils';
import { BulkAction, TableAction, TableColumn } from './types';
import {
  useCloseFabOnClickOutside,
  useTableMobileActionDropdownPosition,
  useTableMobileFabDropdownPosition,
  useTableMobileFabPosition,
} from './useTableMobileLayout';

interface TableMobileViewProps<T extends { id: number | string }> {
  columns: TableColumn<T>[];
  paginatedData: T[];
  loading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  bulkActions: BulkAction<T>[];
  actions: TableAction<T>[];
  selectedItems: T[];
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  onBulkActionClick?: (action: BulkAction<T>, selectedItems: T[]) => void;
  onRowClick?: (item: T, index: number) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  children?: React.ReactNode;
}

function TableMobileView<T extends { id: number | string }>({
  columns,
  paginatedData,
  loading,
  loadingMessage,
  emptyMessage,
  bulkActions,
  actions,
  selectedItems,
  onActionClick,
  onBulkActionClick,
  onRowClick,
  t,
  children,
}: TableMobileViewProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<number | string>>(new Set());
  const [openActionDropdown, setOpenActionDropdown] = useState<number | string | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const dropdownRefs = useRef<Map<number | string, HTMLDivElement>>(new Map());
  const buttonRefs = useRef<Map<number | string, HTMLButtonElement>>(new Map());
  const fabDropdownRef = useRef<HTMLDivElement | null>(null);
  const fabContainerRef = useRef<HTMLDivElement | null>(null);

  const handleCloseFab = useCallback(() => setIsFabOpen(false), []);

  useTableMobileFabPosition(true, fabContainerRef);
  useTableMobileActionDropdownPosition(true, openActionDropdown, buttonRefs, dropdownRefs);
  useTableMobileFabDropdownPosition(true, isFabOpen, fabDropdownRef, fabContainerRef);
  useCloseFabOnClickOutside(true, isFabOpen, fabContainerRef, handleCloseFab);

  const getEssentialColumns = useMemo(() => {
    const essentialKeys = [
      'id',
      'ativo',
      'satisfacao',
      'razao_social',
      'nome_fantasia',
      'nome',
      'cnpj',
      'cpf',
      'cnpj_cpf',
      'data_cadastro',
      'created_at',
    ];

    return columns.filter((col) => {
      const key = col.key.toLowerCase();
      return essentialKeys.some((essential) => key.includes(essential));
    });
  }, [columns]);

  const renderCards = () => {
    if (loading) {
      return (
        <div className="table-mobile-loading">
          <Spinner size="sm" variant="primary" aria-label={loadingMessage} />
        </div>
      );
    }

    if (paginatedData.length === 0) {
      return <div className="table-mobile-empty">{emptyMessage}</div>;
    }

    return (
      <div className="table-mobile-cards">
        {paginatedData.map((item, index) => {
          const isExpanded = expandedRows.has(item.id);
          const essentialFields = getEssentialColumns.slice(0, 5);
          const allFields = columns.filter((col) => !col.hidden);
          const hiddenFields = allFields.filter((col) => !essentialFields.includes(col));

          const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation();
            const newExpanded = new Set(expandedRows);
            if (isExpanded) {
              newExpanded.delete(item.id);
            } else {
              newExpanded.add(item.id);
            }
            setExpandedRows(newExpanded);
          };

          return (
            <div
              key={item.id}
              className={`table-mobile-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => {
                drainPossiblePromise(onRowClick?.(item, index));
              }}
            >
              <div className="table-mobile-card-header">
                <div className="table-mobile-card-header-left">
                  <div className="table-mobile-card-essential">
                    {essentialFields.map((column) => {
                      const value = column.render
                        ? column.render(item, index)
                        : String(item[column.key as keyof T] || '');
                      const key = column.key.toLowerCase();
                      const label = column.label || column.key;

                      let displayValue = value;
                      if (key.includes('ativo')) {
                        displayValue =
                          value === 'true' || value === 'Sim' || value === '1' ? '✓' : '✗';
                      }

                      return (
                        <div key={column.key} className="table-mobile-field">
                          <span className="field-label">{label}:</span>
                          <span className="field-value">{displayValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="table-mobile-card-header-right">
                  {hiddenFields.length > 0 && (
                    <button
                      type="button"
                      className="table-mobile-expand-btn"
                      onClick={toggleExpand}
                      aria-label={isExpanded ? t('ui.hide') : t('ui.show')}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {isExpanded ? (
                          <polyline points="18 15 12 9 6 15"></polyline>
                        ) : (
                          <polyline points="6 9 12 15 18 9"></polyline>
                        )}
                      </svg>
                    </button>
                  )}

                  <div className="table-mobile-actions">
                    <button
                      ref={(el) => {
                        if (el) {
                          buttonRefs.current.set(item.id, el);
                        } else {
                          buttonRefs.current.delete(item.id);
                        }
                      }}
                      type="button"
                      className="table-mobile-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenActionDropdown(openActionDropdown === item.id ? null : item.id);
                      }}
                      aria-label={t('ui.actionsMenu')}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>

                    {openActionDropdown === item.id &&
                      typeof document !== 'undefined' &&
                      createPortal(
                        <>
                          <div
                            className="table-mobile-dropdown-overlay"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionDropdown(null);
                            }}
                          />
                          <div
                            ref={(el) => {
                              if (el) {
                                dropdownRefs.current.set(item.id, el);
                              } else {
                                dropdownRefs.current.delete(item.id);
                              }
                            }}
                            className="table-mobile-dropdown"
                          >
                            {actions.length > 0
                              ? actions
                                  .filter((action) => {
                                    if (typeof action.hidden === 'function') {
                                      return !action.hidden(item);
                                    }
                                    return !action.hidden;
                                  })
                                  .map((action) => {
                                    const isDisabled =
                                      typeof action.disabled === 'function'
                                        ? action.disabled(item)
                                        : action.disabled;

                                    return (
                                      <button
                                        key={action.key}
                                        type="button"
                                        className={`table-mobile-dropdown-item ${action.variant === 'danger' ? 'danger' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenActionDropdown(null);
                                          if (!isDisabled && onActionClick) {
                                            drainPossiblePromise(onActionClick(action, item, index));
                                          } else if (!isDisabled && action.onClick) {
                                            drainPossiblePromise(action.onClick(item, index));
                                          }
                                        }}
                                        disabled={isDisabled}
                                      >
                                        {action.icon && <i className={action.icon}></i>}
                                        <span>{action.label}</span>
                                      </button>
                                    );
                                  })
                              : bulkActions
                                  .filter((bulkAction) => {
                                    const label = bulkAction.label.toLowerCase();
                                    return (
                                      label.includes('editar') ||
                                      label.includes('deletar') ||
                                      label.includes('inserir') ||
                                      label.includes('cancelar') ||
                                      label.includes('selecionar') ||
                                      label.includes('backup') ||
                                      label.includes('terminal') ||
                                      label.includes('testar') ||
                                      label.includes('test connection') ||
                                      Boolean(bulkAction.dropdown)
                                    );
                                  })
                                  .flatMap((bulkAction) => {
                                    const actionKey =
                                      bulkAction.key ||
                                      bulkAction.label.toLowerCase().replace(/\s+/g, '-');
                                    if (bulkAction.dropdown && bulkAction.dropdown.length > 0) {
                                      return bulkAction.dropdown.map((subItem, subIdx) => {
                                        const isItemDisabled =
                                          typeof subItem.disabled === 'function'
                                            ? subItem.disabled([item])
                                            : Boolean(subItem.disabled);
                                        return (
                                          <button
                                            key={`${actionKey}-dd-${subIdx}`}
                                            type="button"
                                            className={`table-mobile-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenActionDropdown(null);
                                              if (isItemDisabled) return;
                                              drainPossiblePromise(subItem.action([item]));
                                            }}
                                            disabled={isItemDisabled}
                                          >
                                            <span>{subItem.label}</span>
                                          </button>
                                        );
                                      });
                                    }
                                    const isBulkDisabled =
                                      typeof bulkAction.disabled === 'function'
                                        ? bulkAction.disabled([item])
                                        : Boolean(bulkAction.disabled);
                                    return [
                                      <button
                                        key={actionKey}
                                        type="button"
                                        className={`table-mobile-dropdown-item ${bulkAction.variant === 'danger' ? 'danger' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenActionDropdown(null);
                                          if (isBulkDisabled) return;
                                          if (bulkAction.onClick) {
                                            drainPossiblePromise(bulkAction.onClick([item]));
                                          } else if (onBulkActionClick) {
                                            drainPossiblePromise(onBulkActionClick(bulkAction, [item]));
                                          }
                                        }}
                                        disabled={isBulkDisabled}
                                      >
                                        <span>{bulkAction.label}</span>
                                      </button>,
                                    ];
                                  })}
                          </div>
                        </>,
                        document.body
                      )}
                  </div>
                </div>
              </div>

              {isExpanded && hiddenFields.length > 0 && (
                <div className="table-mobile-card-details">
                  {hiddenFields.map((column) => {
                    const value = column.render
                      ? column.render(item, index)
                      : String(item[column.key as keyof T] || '');
                    if (!value || value === '') return null;

                    return (
                      <div key={column.key} className="table-mobile-field">
                        <span className="field-label">{column.label || column.key}:</span>
                        <span className="field-value">{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFab = () => {
    if (bulkActions.length === 0) return null;

    const fabActions = bulkActions.filter((bulkAction) => {
      const l = bulkAction.label.toLowerCase();
      const isCreateLike =
        l.includes('nova') ||
        l.includes('novo') ||
        l.includes('create') ||
        l.includes('criar');
      const isTunnelOrBackup =
        l.includes('backup') ||
        l.includes('terminal') ||
        l.includes('testar') ||
        l.includes('test connection');
      const isSyncSei = l.includes('sincronizar') || l.includes('sync sei');
      return isCreateLike || isTunnelOrBackup || isSyncSei;
    });

    if (fabActions.length === 0) return null;

    return (
      <div ref={fabContainerRef} className="table-mobile-fab-container">
        <button
          type="button"
          className="table-mobile-fab-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsFabOpen(!isFabOpen);
          }}
          aria-label={t('ui.actionsMenu')}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {isFabOpen && (
          <div ref={fabDropdownRef} className="table-mobile-fab-dropdown">
            {fabActions.map((bulkAction, index) => {
              const isDisabled =
                typeof bulkAction.disabled === 'function'
                  ? bulkAction.disabled(selectedItems)
                  : Boolean(bulkAction.disabled);
              const icon = bulkAction.icon || 'plus-circle';

              return (
                <button
                  key={index}
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2 py-2 table-text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDisabled && bulkAction.onClick) {
                      setIsFabOpen(false);
                      drainPossiblePromise(bulkAction.onClick(selectedItems));
                    }
                  }}
                  disabled={isDisabled}
                >
                  <i className={`bi bi-${icon}`}></i>
                  <span>{bulkAction.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="table-mobile-container">{renderCards()}</div>
      {children}
      {renderFab()}
    </>
  );
}

export default TableMobileView;
