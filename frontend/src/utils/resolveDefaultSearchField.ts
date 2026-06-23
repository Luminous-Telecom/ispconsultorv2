interface SearchFieldOption {
  key: string;
  label: string;
}

export function resolveDefaultSearchField(
  searchFields: SearchFieldOption[] | undefined,
  preferredField?: string
): string {
  if (!searchFields?.length) return preferredField || '';

  if (preferredField && searchFields.some((field) => field.key === preferredField)) {
    return preferredField;
  }

  const todosField = searchFields.find((field) => field.key === 'todos');
  if (todosField) return 'todos';

  const nonIdField = searchFields.find((field) => field.key !== 'id');
  return nonIdField?.key ?? searchFields[0].key;
}
