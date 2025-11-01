// Tipos comuns e utilitários para o sistema

// Tipo genérico para valores de formulário
export type FormValue = string | number | boolean | string[] | number[] | File | null | undefined;

// Tipo para valores de filtro
export type FilterValue = string | number | boolean | string[] | number[] | File | null | undefined;

// Tipo para event handlers genéricos
export type EventHandler = (event: React.SyntheticEvent) => void;

// Tipo para onChange handlers
export type ChangeHandler<T = FormValue> = (value: T, name?: string) => void;

// Tipo para valores de tabela genéricos
export type TableValue = Record<string, FormValue>;

// Tipo utilitário para extrair valores de objetos
export type ValueOf<T> = T[keyof T];

// Tipo para filter options
export interface FilterOption<T = FilterValue> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Tipo para select options  
export interface SelectOption<T = FormValue> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

// Tipo para render functions
export type RenderFunction<T = unknown> = (item: T, index: number) => React.ReactNode;

// Tipo para callback functions
export type Callback<T = unknown, R = void> = (arg: T) => R;


