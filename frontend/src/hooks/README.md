# Hooks Customizados

## useModalSelect
Hook para gerenciar seleção de itens em modais com suporte a duplo clique.

### Uso
```typescript
import { useModalSelect } from '../hooks/useModalSelect';

const {
  selectedItem,
  handleSelectionChange,
  clearSelection
} = useModalSelect<Entidade>(
  onSelect ? (item) => {
    onSelect(item);
    onClose();
  } : undefined
);
```

### Retorno
- `selectedItem`: Item atualmente selecionado
- `handleSelectionChange`: Handler para mudanças de seleção
- `clearSelection`: Função para limpar seleção
- `lastClickTime`: Timestamp do último clique (interno)
- `lastClickedItem`: Item do último clique (interno)

### Recursos
- Duplo clique (300ms) para seleção rápida
- Modo de seleção (com callback) ou modo normal
- Tipado com generics

## useSelectModal
Hook simples para controlar visibilidade de modais.

### Uso
```typescript
import { useSelectModal } from '../hooks/useSelectModal';

const { showModal, openModal, closeModal, toggleModal } = useSelectModal();
```

### Retorno
- `showModal`: Estado de visibilidade do modal
- `openModal`: Função para abrir o modal
- `closeModal`: Função para fechar o modal
- `toggleModal`: Função para alternar visibilidade

## useEntitySelectField
Hook para gerenciar seleção de entidades em campos de formulário.

### Uso
```typescript
import { useEntitySelectField } from '../hooks/useEntitySelectField';

const planoSelect = useEntitySelectField<Plano>();

// No EntitySelectField
<EntitySelectField
  value={formData.plano_id}
  onChange={(value) => handleInputChange('plano_id', value)}
  onShowModal={planoSelect.openModal}
  entities={planos || []}
/>

// No modal
<PlanoListModal
  show={planoSelect.showModal}
  onClose={planoSelect.closeModal}
  onSelectPlano={(plano) => {
    handleInputChange('plano_id', plano.id);
    planoSelect.handleSelect(plano);
  }}
/>
```

### Retorno
- `selectedId`: ID do item selecionado
- `showModal`: Estado de visibilidade do modal
- `setSelectedId`: Função para definir o ID selecionado
- `openModal`: Função para abrir o modal
- `closeModal`: Função para fechar o modal
- `handleSelect`: Handler para seleção com atualização de ID e fechamento do modal

### Recursos
- Gerencia estado do modal automaticamente
- Atualiza ID e fecha modal ao selecionar
- Genérico e reutilizável

## useListModal
Hook para gerenciar o modal de listagem centralizado.

### Uso
```typescript
import { useListModal } from '../hooks/useListModal';

const modal = useListModal({
  title: 'Selecionar Item',
  columns: [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      render: (item) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (item) => <strong>{item.nome}</strong>
    }
  ],
  searchPlaceholder: 'Buscar...',
  multiSelect: false
});
```

### Retorno
- `showModal`: Estado de visibilidade do modal
- `openModal`: Função para abrir o modal
- `closeModal`: Função para fechar o modal
- `config`: Configuração do modal
- `setConfig`: Função para atualizar a configuração
- `search`: Valor da busca
- `setSearch`: Função para atualizar a busca
- `page`: Página atual
- `setPage`: Função para mudar de página
- `limit`: Limite de itens por página
- `setLimit`: Função para mudar o limite

### Recursos
- Busca e filtros integrados
- Paginação automática
- Seleção múltipla ou única
- Ações em lote
- Refresh de dados

## Exemplos de Uso

### BancoListModal
```typescript
const {
  selectedItem,
  handleSelectionChange,
  clearSelection
} = useModalSelect<Banco>(
  onSelectBanco ? (banco) => {
    onSelectBanco(banco);
    onClose();
  } : undefined
);

<Table onSelectionChange={handleSelectionChange} />
```

### TituloEditModal
```typescript
const planoSelect = useEntitySelectField<{ id: number }>();

<EntitySelectField
  onShowModal={planoSelect.openModal}
/>

<PlanoListModal
  show={planoSelect.showModal}
  onClose={planoSelect.closeModal}
  onSelectPlano={(plano) => {
    handleInputChange('plano_id', plano.id);
    planoSelect.handleSelect(plano);
  }}
/>
```

## ListModal Component
Componente centralizado para exibição de listas em modais.

### Uso
```typescript
import ListModal from '../components/common/ListModal';

<ListModal
  show={show}
  onClose={onClose}
  config={config}
  data={data}
  loading={isLoading}
  selectedItems={selectedItems}
  onSelectionChange={handleSelectionChange}
  search={search}
  onSearchChange={setSearch}
  pagination={pagination}
  onPageChange={setPage}
  limit={limit}
  onLimitChange={setLimit}
  onRefresh={refetch}
  bulkActions={bulkActions}
/>
```

### Recursos
- Tabela com paginação integrada
- Busca e filtros
- Seleção múltipla ou única
- Ações em lote
- Refresh de dados
- Tipado com generics
