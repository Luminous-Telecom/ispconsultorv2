import { useCallback, useEffect, useRef, useState } from 'react';
import type { SortDirection } from '../types';
import {
  ColumnFilterRule,
  FilterableColumn,
  SavedTableView,
  createRuleId,
  createViewId,
  normalizeHiddenKeys,
  operatorsFor,
  readViews,
  resolveFilterKind,
  ruleIsComplete,
  upsertView,
  writeViews,
} from './model';

interface UseTableViewOptions {
  tableId: string;
  columns: FilterableColumn[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  onColumnFiltersChange?: (rules: ColumnFilterRule[]) => void;
}

export function useTableView({
  tableId,
  columns,
  sortColumn,
  sortDirection,
  onSort,
  onColumnFiltersChange,
}: UseTableViewOptions) {
  const [loadedTableId, setLoadedTableId] = useState(tableId);
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([]);
  const [views, setViews] = useState<SavedTableView[]>(() => readViews(tableId));
  const [rules, setRules] = useState<ColumnFilterRule[]>([]);
  const [appliedRules, setAppliedRules] = useState<ColumnFilterRule[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [listOnOpen, setListOnOpen] = useState(false);
  const onSortRef = useRef(onSort);
  const onFiltersRef = useRef(onColumnFiltersChange);
  onSortRef.current = onSort;
  onFiltersRef.current = onColumnFiltersChange;

  if (loadedTableId !== tableId) {
    setLoadedTableId(tableId);
    setHiddenColumnKeys([]);
    setViews(readViews(tableId));
    setRules([]);
    setAppliedRules([]);
    setActiveViewId(null);
    setDraftName('');
    setIsDefault(false);
    setListOnOpen(false);
  }

  useEffect(() => {
    if (loadedTableId !== tableId) return;
    writeViews(tableId, views);
  }, [views, loadedTableId, tableId]);

  const rulesKey = JSON.stringify(rules.filter(ruleIsComplete).map((rule) => ({
    columnKey: rule.columnKey,
    operator: rule.operator,
    value: rule.value,
  })));

  useEffect(() => {
    const complete = rules.filter(ruleIsComplete);
    setAppliedRules(complete);
    onFiltersRef.current?.(complete);
  }, [rulesKey, rules]);

  const publish = useCallback((nextRules: ColumnFilterRule[], view?: SavedTableView) => {
    const complete = nextRules.filter(ruleIsComplete);
    setRules(nextRules);
    setAppliedRules(complete);
    onFiltersRef.current?.(complete);
    if (view?.sortColumn && view.sortDirection) {
      onSortRef.current?.(view.sortColumn, view.sortDirection);
    }
  }, []);

  const applyView = useCallback(
    (view: SavedTableView) => {
      setActiveViewId(view.id);
      setDraftName(view.name);
      setIsDefault(view.isDefault);
      setListOnOpen(view.listOnOpen);
      const hidden = normalizeHiddenKeys(view.hiddenColumnKeys, columns);
      setHiddenColumnKeys(hidden);
      publish(view.rules, view);
    },
    [columns, publish]
  );

  const toggleColumn = useCallback(
    (columnKey: string) => {
      setHiddenColumnKeys((current) => {
        const hidden = current.includes(columnKey)
          ? current.filter((key) => key !== columnKey)
          : [...current, columnKey];
        return normalizeHiddenKeys(hidden, columns);
      });
    },
    [columns]
  );

  const setAllColumns = useCallback(
    (visible: boolean) => {
      if (visible) {
        setHiddenColumnKeys([]);
        return;
      }
      const keys = columns.filter((column) => !column.hidden).map((column) => column.key);
      setHiddenColumnKeys(normalizeHiddenKeys(keys, columns));
    },
    [columns]
  );

  const commitRule = useCallback(
    (draft: { columnKey: string; operator: ColumnFilterRule['operator']; value: string }) => {
      const value = draft.value.trim();
      if (!draft.columnKey || !value) return;
      setRules((current) => {
        const exists = current.some(
          (rule) => rule.columnKey === draft.columnKey && rule.operator === draft.operator && rule.value === value
        );
        if (exists) return current;
        return [...current, { id: createRuleId(draft.columnKey), columnKey: draft.columnKey, operator: draft.operator, value }];
      });
    },
    []
  );

  const addRule = useCallback(
    (columnKey: string) => {
      const column = columns.find((item) => item.key === columnKey);
      if (!column) return;
      const operator = operatorsFor(resolveFilterKind(column))[0];
      setRules((current) => [...current, { id: createRuleId(columnKey), columnKey, operator, value: '' }]);
    },
    [columns]
  );

  const updateRule = useCallback((id: string, patch: Partial<Pick<ColumnFilterRule, 'operator' | 'value'>>) => {
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((current) => current.filter((rule) => rule.id !== id));
  }, []);

  const applyRules = useCallback(() => {
    publish(rules);
  }, [publish, rules]);

  const clearRules = useCallback(() => {
    setRules([]);
    setAppliedRules([]);
    onFiltersRef.current?.([]);
  }, []);

  const saveView = useCallback((): boolean => {
    const name = draftName.trim();
    if (!name) return false;
    setActiveViewId(null);
    setViews((current) => {
      const selected = activeViewId ? current.find((item) => item.id === activeViewId) : undefined;
      const sameName = current.find((item) => item.name === name);
      const view: SavedTableView = {
        id: selected?.id ?? sameName?.id ?? createViewId(),
        name,
        isDefault,
        listOnOpen,
        hiddenColumnKeys,
        rules: rules.filter(ruleIsComplete),
        sortColumn: sortColumn || undefined,
        sortDirection,
      };
      return upsertView(current, view);
    });
    return true;
  }, [activeViewId, draftName, hiddenColumnKeys, isDefault, listOnOpen, rules, sortColumn, sortDirection]);

  const deleteView = useCallback((id: string) => {
    setViews((current) => current.filter((view) => view.id !== id));
    setActiveViewId((current) => (current === id ? null : current));
  }, []);

  const resetView = useCallback(() => {
    const fallback = views.find((view) => view.isDefault);
    if (fallback) {
      applyView(fallback);
      return;
    }
    setActiveViewId(null);
    setDraftName('');
    setIsDefault(false);
    setListOnOpen(false);
    setHiddenColumnKeys([]);
    clearRules();
  }, [applyView, clearRules, views]);

  return {
    hiddenColumnKeys,
    views,
    rules,
    appliedRules,
    activeViewId,
    draftName,
    isDefault,
    listOnOpen,
    setDraftName,
    setIsDefault,
    setListOnOpen,
    toggleColumn,
    setAllColumns,
    addRule,
    commitRule,
    updateRule,
    removeRule,
    applyRules,
    clearRules,
    saveView,
    deleteView,
    applyView,
    resetView,
  };
}
