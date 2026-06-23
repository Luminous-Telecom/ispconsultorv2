import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { TranslationKeys } from 'contexts/I18nContext';
import { resolveDefaultSearchField } from 'utils/resolveDefaultSearchField';

interface SearchFieldOption {
  key: string;
  label: string;
}

interface UseTableHeaderSyncParams {
  syncWithHeader: boolean;
  search?: string;
  title?: string;
  searchable: boolean;
  showToolbar: boolean;
  configSearchFields?: SearchFieldOption[];
  configSearchField: string;
  defaultSearchPlaceholder: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  localSearchField: string;
  setLocalSearchField: (field: string) => void;
  onSearchFieldChange?: (field: string) => void;
  handleReloadClick: () => void;
  t: (key: keyof TranslationKeys) => string;
}

export function useTableHeaderSync({
  syncWithHeader,
  search,
  title,
  searchable,
  showToolbar,
  configSearchFields,
  configSearchField,
  defaultSearchPlaceholder,
  searchTerm,
  setSearchTerm,
  localSearchField,
  setLocalSearchField,
  onSearchFieldChange,
  handleReloadClick,
  t,
}: UseTableHeaderSyncParams) {
  const {
    setTitle: setHeaderTitle,
    setShowSearch: setHeaderShowSearch,
    setShowReload: setHeaderShowReload,
    setOnSearchClick: setHeaderOnSearchClick,
    setSearchPlaceholder: setHeaderSearchPlaceholder,
    setOnReloadClick: setHeaderOnReloadClick,
    setSearchValue: setHeaderSearchValue,
    searchValue: headerSearchValue,
    searchField: headerSearchField,
    setSearchField: setHeaderSearchField,
    availableSearchFields: headerAvailableSearchFields,
    setAvailableSearchFields: setHeaderAvailableSearchFields,
  } = useTableHeader();

  const selectedSearchField = syncWithHeader ? headerSearchField || localSearchField : localSearchField;

  const onSearchRef = useRef<(term: string, field: string) => void>(() => {});
  const selectedSearchFieldRef = useRef(selectedSearchField);
  selectedSearchFieldRef.current = selectedSearchField;

  const handleHeaderSearchClickRef = useRef<(value?: string) => void>(() => {});
  handleHeaderSearchClickRef.current = (value?: string) => {
    if (value !== undefined) {
      setSearchTerm(value);
      onSearchRef.current?.(value, selectedSearchFieldRef.current || '');
    }
  };

  const handleHeaderSearchClick = useCallback((value?: string) => {
    handleHeaderSearchClickRef.current(value);
  }, []);

  const stableSearchFields = useMemo(
    () => JSON.stringify(configSearchFields),
    [configSearchFields]
  );

  const initialSyncRef = useRef(false);
  const tableSearchHydratedFromHeaderRef = useRef(false);

  useEffect(() => {
    if (!syncWithHeader) return;
    const timeoutId = setTimeout(() => {
      setHeaderTitle(title || 'Lista');
      setHeaderShowSearch(searchable || false);
      setHeaderShowReload(showToolbar);
      setHeaderOnSearchClick(() => handleHeaderSearchClick);
      setHeaderSearchPlaceholder(defaultSearchPlaceholder);
      setHeaderOnReloadClick(() => handleReloadClick);

      const parsedFields = configSearchFields || [];

      if (parsedFields.length > 0) {
        const fields = parsedFields.map((f) => ({ id: f.key, label: f.label }));
        const currentFieldsJson = JSON.stringify(headerAvailableSearchFields);
        const newFieldsJson = JSON.stringify(fields);
        if (currentFieldsJson !== newFieldsJson) {
          setHeaderAvailableSearchFields(fields);
        }

        const parsedFieldKeys = new Set(parsedFields.map((f) => f.key));
        const defaultField = resolveDefaultSearchField(parsedFields, configSearchField);
        const headerFieldIsValid = Boolean(headerSearchField && parsedFieldKeys.has(headerSearchField));
        if (defaultField && !headerFieldIsValid) {
          setHeaderSearchField(defaultField);
        }
      } else {
        const defaults = [
          { id: 'nome', label: t('table.clientName') },
          { id: 'cnpj_cpf', label: `${t('form.cnpj')}/CPF` },
          { id: 'whatsapp', label: t('form.phone') },
          { id: 'email', label: t('form.email') },
        ];
        const currentFieldsJson = JSON.stringify(headerAvailableSearchFields);
        const defaultsJson = JSON.stringify(defaults);
        if (currentFieldsJson !== defaultsJson) {
          setHeaderAvailableSearchFields(defaults);
        }
      }

      if (!initialSyncRef.current) {
        initialSyncRef.current = true;
        setTimeout(() => {
          if (search !== undefined) {
            setSearchTerm(search);
          } else if (headerSearchValue && !searchTerm) {
            setSearchTerm(headerSearchValue);
          } else if (searchTerm && !headerSearchValue) {
            setHeaderSearchValue(searchTerm);
          }
        }, 0);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncWithHeader, title, searchable, stableSearchFields, showToolbar]);

  useEffect(() => {
    if (!syncWithHeader) return;
    return () => {
      setHeaderOnSearchClick(null);
      setHeaderOnReloadClick(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncWithHeader]);

  useEffect(() => {
    if (!syncWithHeader) return;
    if (headerSearchValue === searchTerm) {
      tableSearchHydratedFromHeaderRef.current = true;
    }
  }, [syncWithHeader, headerSearchValue, searchTerm]);

  useEffect(() => {
    if (!syncWithHeader) return;
    if (initialSyncRef.current && search === undefined && headerSearchValue !== searchTerm) {
      const timeoutId = setTimeout(() => setSearchTerm(headerSearchValue), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [syncWithHeader, headerSearchValue, searchTerm, search, setSearchTerm]);

  useEffect(() => {
    if (!syncWithHeader) return;
    if (
      !tableSearchHydratedFromHeaderRef.current &&
      searchTerm === '' &&
      headerSearchValue !== ''
    ) {
      return;
    }
    if (headerSearchValue === '' && searchTerm !== '') return;
    const isHeaderAheadOfTable =
      searchTerm !== '' &&
      headerSearchValue.length > searchTerm.length &&
      headerSearchValue.startsWith(searchTerm);
    if (isHeaderAheadOfTable) return;
    const isHeaderShrinkingWhileTableStale =
      searchTerm !== '' &&
      headerSearchValue !== '' &&
      searchTerm.length > headerSearchValue.length &&
      searchTerm.startsWith(headerSearchValue);
    if (isHeaderShrinkingWhileTableStale) return;
    if (searchTerm !== headerSearchValue) {
      setHeaderSearchValue(searchTerm);
    }
  }, [syncWithHeader, searchTerm, headerSearchValue, setHeaderSearchValue]);

  useEffect(() => {
    if (!syncWithHeader) return;
    if (headerSearchField && headerSearchField !== localSearchField) {
      const timeoutId = setTimeout(() => {
        setLocalSearchField(headerSearchField);
        onSearchFieldChange?.(headerSearchField);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [syncWithHeader, headerSearchField, localSearchField, onSearchFieldChange, setLocalSearchField]);

  const bindHeaderSearchHandler = useCallback((handler: (term: string, field: string) => void) => {
    onSearchRef.current = handler;
  }, []);

  const handleLocalSearchFieldChange = useCallback(
    (newField: string) => {
      if (headerSearchField && syncWithHeader) {
        setHeaderSearchField(newField);
      } else {
        setLocalSearchField(newField);
      }
      onSearchFieldChange?.(newField);
    },
    [
      headerSearchField,
      syncWithHeader,
      setHeaderSearchField,
      setLocalSearchField,
      onSearchFieldChange,
    ]
  );

  return {
    selectedSearchField,
    headerSearchField,
    setHeaderSearchField,
    handleLocalSearchFieldChange,
    bindHeaderSearchHandler,
  };
}
