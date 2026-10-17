import React, { useRef, useEffect } from 'react';
import { IconOnlyButton } from 'components/ui';

export interface SearchFieldOption {
  key?: string;
  id?: string;
  label: string;
}

/** Retorna o identificador do campo (key ou id) */
function getFieldKey(f: SearchFieldOption): string {
  return f.key ?? f.id ?? '';
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  searchField?: string;
  onSearchFieldChange?: (field: string) => void;
  searchFields?: SearchFieldOption[];
  id?: string;
  className?: string;
  /** 'table' = compacto em tabelas/modais, 'navbar' = header do layout, 'mobile' = busca expandida mobile, 'inline' = compacto mobile (ícone + input) */
  variant?: 'table' | 'navbar' | 'mobile' | 'inline';
  autoComplete?: 'on' | 'off';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar...',
  searchField = '',
  onSearchFieldChange,
  searchFields = [],
  id = 'search-bar',
  className = '',
  variant = 'table',
  autoComplete = 'off',
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  const showFieldSelect = searchFields.length > 1;
  const normalizedFields = searchFields.map((f) => ({
    key: getFieldKey(f),
    label: f.label,
  }));
  const effectiveSearchField = searchField || normalizedFields[0]?.key || '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSearch(value);
  };

  // Ajustar largura do select = conteúdo + seta (todas as variantes que exibem select)
  useEffect(() => {
    if (!showFieldSelect || !selectRef.current) return;
    const select = selectRef.current;
    const opt = normalizedFields.find((f) => f.key === effectiveSearchField);
    if (!opt) return;
    const computed = window.getComputedStyle(select);
    const temp = document.createElement('span');
    temp.className = 'measure-text-offscreen';
    temp.style.fontSize = computed.fontSize;
    temp.style.fontFamily = computed.fontFamily;
    temp.style.fontWeight = computed.fontWeight;
    temp.textContent = opt.label;
    document.body.appendChild(temp);
    // padding-left + padding-right (seta) - espaço para o conteúdo + seta do dropdown
    const extraSpace = 40; // padding esquerda + área da seta
    const w = Math.max(42, temp.offsetWidth + extraSpace);
    document.body.removeChild(temp);
    select.style.width = `${w}px`;
  }, [variant, effectiveSearchField, normalizedFields, showFieldSelect]);

  const isNavbar = variant === 'navbar';
  const isMobile = variant === 'mobile';
  const isInline = variant === 'inline';

  const containerClass = isNavbar
    ? 'navbar-search-container'
    : isMobile
      ? 'd-flex flex-grow-1'
      : isInline
        ? 'navbar-inline-search'
        : 'table-search-combined';

  const selectClass = isNavbar
    ? 'navbar-search-field'
    : isMobile
      ? 'navbar-mobile-search-field'
      : isInline
        ? ''
        : 'form-select form-select-sm table-search-field-select';

  const inputClass = isNavbar
    ? 'navbar-search-input'
    : isMobile
      ? 'navbar-mobile-search-input'
      : isInline
        ? 'navbar-inline-search-input'
        : 'form-control form-control-sm table-search-input';

  const iconClass = isNavbar ? 'navbar-search-icon' : 'table-search-icon p-0 border-0';

  const inputEl = (
    <input
      type="search"
      id={`${id}-input`}
      name="search"
      className={`${inputClass}${!isNavbar && !isMobile && !isInline ? ' search-bar-min-w-120' : ''}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      autoComplete={autoComplete}
      aria-label={placeholder}
    />
  );

  const clearButton = value.trim() ? (
    <IconOnlyButton
      type="button"
      className={isNavbar ? 'navbar-search-form__clear' : 'navbar-inline-search-clear'}
      onClick={() => onChange('')}
      label="Limpar busca"
      iconClassName="bi bi-x-lg"
    />
  ) : null;

  if (isNavbar) {
    return (
      <div className={`${containerClass} ${className}`.trim()}>
        {showFieldSelect && (
          <select
            ref={selectRef}
            id={`${id}-field`}
            name="searchField"
            className={selectClass}
            value={effectiveSearchField}
            onChange={(e) => onSearchFieldChange?.(e.target.value)}
            aria-label="Campo de busca"
          >
            {normalizedFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        <form className="navbar-search-form" role="search" onSubmit={handleSubmit}>
          <i className="bi bi-search navbar-search-form__icon" aria-hidden />
          {inputEl}
          {clearButton}
        </form>
      </div>
    );
  }

  if (isInline) {
    return (
      <div className={`${containerClass} ${className}`.trim()}>
        <i className="bi bi-search navbar-inline-search-icon" aria-hidden />
        {inputEl}
        {clearButton}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={`${containerClass} ${className}`.trim()}>
        {showFieldSelect && (
          <select
            ref={selectRef}
            id={`${id}-field`}
            name="searchField"
            className={selectClass}
            value={effectiveSearchField}
            onChange={(e) => onSearchFieldChange?.(e.target.value)}
            aria-label={placeholder}
          >
            {normalizedFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        {inputEl}
      </div>
    );
  }

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {showFieldSelect && (
        <select
          ref={selectRef}
          id={`${id}-field`}
          className={selectClass}
          value={effectiveSearchField}
          onChange={(e) => onSearchFieldChange?.(e.target.value)}
          aria-label={placeholder}
        >
          {normalizedFields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      )}
      <div className="position-relative flex-fill-min-w-0">
        {inputEl}
        <IconOnlyButton
          type="button"
          variant="ghost"
          className={iconClass}
          onClick={() => onSearch(value)}
          label={placeholder}
          iconClassName="bi bi-search text-muted"
        />
      </div>
    </div>
  );
};

export default SearchBar;
