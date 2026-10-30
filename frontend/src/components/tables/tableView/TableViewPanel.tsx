import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { AppButton, Checkbox, CloseIconButton, FiltrarButton, FormField, IconOnlyButton, LimparButton, PositionedFixed, SalvarButton } from 'components/ui';
import TableViewFilterChips from './TableViewFilterChips';
import TableViewSelector from './TableViewSelector';
import {
  ColumnFilterOperator,
  ColumnFilterRule,
  FilterableColumn,
  SavedTableView,
} from './model';

interface TableViewPanelProps {
  columns: FilterableColumn[];
  rows: readonly object[];
  hiddenColumnKeys: string[];
  views: SavedTableView[];
  rules: ColumnFilterRule[];
  activeViewId: string | null;
  draftName: string;
  isDefault: boolean;
  filtersOnPage: boolean;
  hasActiveState: boolean;
  onDraftName: (name: string) => void;
  onIsDefault: (value: boolean) => void;
  onToggleColumn: (columnKey: string) => void;
  onSetAllColumns: (visible: boolean) => void;
  onCommitRule: (rule: { columnKey: string; operator: ColumnFilterOperator; value: string }) => void;
  onRemoveRule: (id: string) => void;
  onApplyRules: () => void;
  onClearRules: () => void;
  onSave: () => boolean;
  onDeleteView: (id: string) => void;
  onApplyView: (view: SavedTableView) => void;
  onReset: () => void;
}

const TableViewPanel: React.FC<TableViewPanelProps> = ({
  columns,
  rows,
  hiddenColumnKeys,
  views,
  rules,
  activeViewId,
  draftName,
  isDefault,
  filtersOnPage,
  hasActiveState,
  onDraftName,
  onIsDefault,
  onToggleColumn,
  onSetAllColumns,
  onCommitRule,
  onRemoveRule,
  onApplyRules,
  onClearRules,
  onSave,
  onDeleteView,
  onApplyView,
  onReset,
}) => {
  const { t } = useI18n();
  const { warning } = useNotificationContext();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ left: 8, top: 8 });

  const placePanel = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(720, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    let top = rect.bottom + 4;
    if (top + 360 > window.innerHeight) top = Math.max(8, rect.top - 360);
    setAnchor({ left, top });
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    const origin = { dx: event.clientX - anchor.left, dy: event.clientY - anchor.top };
    const move = (pointer: MouseEvent) => {
      const width = panelRef.current?.offsetWidth ?? 320;
      const height = panelRef.current?.offsetHeight ?? 120;
      const left = Math.min(Math.max(8, pointer.clientX - origin.dx), Math.max(8, window.innerWidth - width - 8));
      const top = Math.min(Math.max(8, pointer.clientY - origin.dy), Math.max(8, window.innerHeight - Math.min(height, 80) - 8));
      setAnchor({ left, top });
    };
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  };

  const handleSave = () => {
    if (!onSave()) warning(t('tableView.nameRequired'));
  };

  const panel = open
    ? createPortal(
        <PositionedFixed left={anchor.left} top={anchor.top} className="table-view-panel-anchor">
          <div ref={panelRef} className="table-view-panel" role="dialog" aria-modal="false" aria-label={t('tableView.title')}>
            <div className="table-view-panel__heading table-view-panel__drag" onMouseDown={handleDragStart}>
              <span>{t('tableView.title')}</span>
              <CloseIconButton onClick={() => setOpen(false)} />
            </div>
            <div className="table-view-panel__body">
            <div className="table-view-panel__filters">
              <div className="table-view-panel__heading">
                <span>{t('tableView.selector')}</span>
              </div>
              <TableViewSelector columns={columns} rows={rows} onCommit={onCommitRule} />
              <div className="table-view-panel__heading">
                <span>{t('tableView.filters')}</span>
              </div>
              <TableViewFilterChips rules={rules} columns={columns} onRemove={onRemoveRule} />
              <FormField
                name="table-view-saved"
                type="select"
                size="sm"
                label={t('tableView.savedQueries')}
                value={activeViewId ?? ''}
                placeholder={t('tableView.noSavedQueries')}
                options={views.map((view) => ({ value: view.id, label: view.name }))}
                onChange={(value) => {
                  const view = views.find((item) => item.id === String(value));
                  if (view) onApplyView(view);
                }}
              />
              {filtersOnPage && <p className="table-view-hint">{t('tableView.pageOnlyHint')}</p>}
              <div className="table-view-actions">
                <IconOnlyButton label={t('tableView.reset')} iconClassName="bi bi-house" onClick={onReset} />
                <FiltrarButton type="button" onClick={onApplyRules} />
                <LimparButton type="button" onClick={onClearRules} />
              </div>
            </div>
            <div className="table-view-panel__columns">
              <div className="table-view-panel__heading">
                <span>{t('tableView.columns')}</span>
              </div>
              <div className="table-view-column-actions">
                <AppButton label={t('tableView.disableAll')} variant="outline-primary" size="sm" onClick={() => onSetAllColumns(false)} />
                <AppButton label={t('tableView.enableAll')} variant="outline-primary" size="sm" onClick={() => onSetAllColumns(true)} />
              </div>
              <div className="table-view-columns">
                {columns.filter((column) => !column.hidden).map((column) => (
                  <Checkbox
                    key={column.key}
                    id={`table-col-${column.key}`}
                    label={column.label}
                    checked={!hiddenColumnKeys.includes(column.key)}
                    onChange={() => onToggleColumn(column.key)}
                  />
                ))}
              </div>
              <Checkbox
                id="table-view-default"
                label={t('tableView.defaultQuery')}
                checked={isDefault}
                onChange={(event) => onIsDefault(event.value)}
              />
              <FormField
                name="table-view-name"
                type="text"
                size="sm"
                label={t('tableView.queryName')}
                value={draftName}
                onChange={(value) => onDraftName(String(value ?? ''))}
              />
              <div className="table-view-actions">
                <SalvarButton type="button" onClick={handleSave} />
                <IconOnlyButton
                  label={t('tableView.deleteQuery')}
                  iconClassName="bi bi-trash"
                  disabled={!activeViewId}
                  onClick={() => activeViewId && onDeleteView(activeViewId)}
                />
              </div>
            </div>
            </div>
          </div>
        </PositionedFixed>,
        document.body
      )
    : null;

  return (
    <>
      <IconOnlyButton
        ref={buttonRef}
        label={t('tableView.open')}
        iconClassName="bi bi-gear"
        variant="outline-primary"
        className={`table-toolbar-btn${hasActiveState ? ' table-view-toggle--active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      />
      {panel}
    </>
  );
};

export default TableViewPanel;
