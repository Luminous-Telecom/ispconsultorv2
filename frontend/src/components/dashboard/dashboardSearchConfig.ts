import type { SearchFieldOption } from 'components/ui/SearchBar';

export const DASHBOARD_SEARCH_HEADER_FIELDS: SearchFieldOption[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'id', label: 'ID' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'nome_fantasia', label: 'Nome Fantasia' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
];

export const DASHBOARD_SEARCH_PLACEHOLDER = 'Buscar clientes...';
