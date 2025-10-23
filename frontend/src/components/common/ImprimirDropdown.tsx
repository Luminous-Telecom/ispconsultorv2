interface ImprimirDropdownConfig {
  selectedItems: any[];
  totalItems: any[];
  onImprimirSelecionados: (ids: string) => void;
  onImprimirTodos: (ids: string) => void;
  filterLabel?: string;
}

export const createImprimirDropdown = ({
  selectedItems,
  totalItems,
  onImprimirSelecionados,
  onImprimirTodos,
  filterLabel = 'Todos'
}: ImprimirDropdownConfig) => {
  const handleImprimirSelecionados = () => {
    if (selectedItems.length > 0) {
      const ids = selectedItems.map(item => item.id);
      const idsParam = ids.join(',');
      onImprimirSelecionados(idsParam);
    }
  };

  const handleImprimirTodos = () => {
    if (totalItems.length > 0) {
      const ids = totalItems.map(item => item.id);
      const idsParam = ids.join(',');
      onImprimirTodos(idsParam);
    }
  };

  return {
    label: 'Imprimir',
    variant: 'success',
    dropdown: [
      {
        label: `Imprimir Selecionados (${selectedItems.length})`,
        action: handleImprimirSelecionados
      },
      {
        label: `Imprimir ${filterLabel}`,
        action: handleImprimirTodos
      }
    ]
  };
};
