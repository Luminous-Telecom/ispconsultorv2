interface ItemWithId {
  id: number | string;
}

interface ImprimirDropdownConfig {
  selectedItems: ItemWithId[];
  totalItems: ItemWithId[];
  onImprimirSelecionados: (ids: string) => void;
  onImprimirTodos: (ids: string) => void;
  filterLabel?: string;
}

interface ImprimirDropdownReturn {
  label: string;
  variant: 'primary';
  dropdown: {
    label: string;
    action: () => void;
  }[];
}

export const createImprimirDropdown = ({
  selectedItems,
  totalItems,
  onImprimirSelecionados,
  onImprimirTodos,
  filterLabel = 'Todos'
}: ImprimirDropdownConfig): ImprimirDropdownReturn => {
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
    variant: 'primary',
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
