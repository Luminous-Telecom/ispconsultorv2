# Convenções de Nomenclatura - BackNet ERP

Este documento define as convenções de nomenclatura utilizadas no projeto BackNet ERP para garantir consistência e legibilidade do código.

## 📋 Índice

1. [Arquivos](#arquivos)
2. [Variáveis e Constantes](#variáveis-e-constantes)
3. [Funções e Métodos](#funções-e-métodos)
4. [Componentes React](#componentes-react)
5. [Tipos e Interfaces](#tipos-e-interfaces)
6. [Hooks](#hooks)
7. [Classes](#classes)
8. [Constantes](#constantes)

---

## Arquivos

### Frontend

- **Componentes React**: `PascalCase.tsx`
  - Exemplo: `ClienteModal.tsx`, `TableColumn.tsx`, `Dashboard.tsx`

- **Hooks**: `camelCase.ts` com prefixo `use`
  - Exemplo: `useClientes.ts`, `useDashboard.ts`, `useTable.ts`

- **Services**: `camelCase.ts`
  - Exemplo: `clienteService.ts`, `tituloService.ts`, `authService.ts`

- **Types/Interfaces**: `camelCase.ts` ou `kebab-case.ts`
  - Exemplo: `entities.ts`, `api.ts`, `common.ts`

- **Utils**: `camelCase.ts`
  - Exemplo: `formatters.ts`, `validators.ts`, `dateUtils.ts`

### Backend

- **Controllers**: `PascalCase.ts`
  - Exemplo: `ClienteController.ts`, `TituloController.ts`

- **Services**: `PascalCase.ts`
  - Exemplo: `ClienteService.ts`, `VariaveisDocumentoService.ts`

- **Models**: `PascalCase.ts`
  - Exemplo: `Cliente.ts`, `Titulo.ts`, `Contrato.ts`

- **Migrations**: `YYYYMMDDHHMMSS-description.js` (sempre JavaScript)
  - Exemplo: `20240101120000-create-clientes.js`

---

## Variáveis e Constantes

### Variáveis

- **Formato**: `camelCase`
- **Nomes descritivos**: Evite abreviações desnecessárias
- **Booleans**: Use prefixos `is`, `has`, `should`, `can`
- **Arrays**: Use plural ou sufixo `List`
- **Objetos**: Use substantivos no singular

**Exemplos:**
```typescript
// ✅ Correto
const cliente = { id: 1, nome: 'João' };
const clientes = [cliente1, cliente2];
const isActive = true;
const hasPermission = false;
const shouldValidate = true;
const canEdit = false;
const titulosList = [];
const selectedItems = [];

// ❌ Incorreto
const cli = { id: 1 }; // Abreviação
const active = true; // Sem prefixo para boolean
const titulos_array = []; // snake_case
const SelectedItems = []; // PascalCase para variável
```

### Constantes

- **Formato**: `UPPER_SNAKE_CASE`
- **Use para valores que não mudam durante a execução**

**Exemplos:**
```typescript
// ✅ Correto
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 15;

// ❌ Incorreto
const maxRetries = 3; // camelCase para constante
const apiBaseUrl = 'https://api.example.com';
```

---

## Funções e Métodos

### Funções

- **Formato**: `camelCase`
- **Verbos no infinitivo**: `get`, `create`, `update`, `delete`, `validate`
- **Handlers**: Prefixo `handle`
- **Callbacks**: Prefixo `on` quando apropriado

**Exemplos:**
```typescript
// ✅ Correto
function getClienteById(id: number): Cliente { }
function createTitulo(data: CreateTituloDTO): Promise<Titulo> { }
function handleSubmit(event: FormEvent): void { }
function onSelectionChange(items: Cliente[]): void { }
function validateForm(data: FormData): boolean { }

// ❌ Incorreto
function GetClienteById(id: number) { } // PascalCase
function criar_titulo(data: CreateTituloDTO) { } // snake_case
function submit(event: FormEvent) { } // Sem prefixo handle
```

### Métodos de Classe

- **Formato**: `camelCase`
- **Mesmas regras das funções**

**Exemplos:**
```typescript
class ClienteService {
  async list(filters?: ClienteFilters): Promise<PaginatedResponse<Cliente>> { }
  async getById(id: number): Promise<Cliente> { }
  async create(data: CreateCliente): Promise<Cliente> { }
  async update(id: number, data: UpdateCliente): Promise<Cliente> { }
  async delete(id: number): Promise<void> { }
}
```

---

## Componentes React

### Componentes Funcionais

- **Formato**: `PascalCase`
- **Nomes descritivos**: Use substantivos que descrevam o propósito

**Exemplos:**
```typescript
// ✅ Correto
const ClienteModal: React.FC<ClienteModalProps> = ({ show, onClose }) => { };
const TableColumn = <T>({ column }: TableColumnProps<T>) => { };
const Dashboard: React.FC = () => { };

// ❌ Incorreto
const clienteModal = () => { }; // camelCase
const table_column = () => { }; // snake_case
```

### Props de Componentes

- **Formato**: `PascalCase` com sufixo `Props`
- **Interface ou type**: `PascalCase`

**Exemplos:**
```typescript
// ✅ Correto
interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clienteId?: number;
}

type TableColumnProps<T> = {
  column: TableColumnType<T>;
  onSort?: (column: string) => void;
};

// ❌ Incorreto
interface clienteModalProps { } // camelCase
type table_column_props = { }; // snake_case
```

---

## Tipos e Interfaces

### Interfaces

- **Formato**: `PascalCase`
- **Sem prefixo `I`**: Não use `ICliente`, use `Cliente`
- **Props**: Sufixo `Props`
- **Config**: Sufixo `Config`

**Exemplos:**
```typescript
// ✅ Correto
interface Cliente {
  id: number;
  razao_social: string;
}

interface ClienteModalProps {
  show: boolean;
}

interface TableConfig<T> {
  columns: TableColumn<T>[];
  data: T[];
}

// ❌ Incorreto
interface ICliente { } // Prefixo I
interface cliente { } // camelCase
interface cliente_modal_props { } // snake_case
```

### Types

- **Formato**: `PascalCase`
- **Mesmas regras das interfaces**

**Exemplos:**
```typescript
// ✅ Correto
type StatusTitulo = 'pendente' | 'vencido' | 'pago';
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

// ❌ Incorreto
type status_titulo = 'pendente' | 'vencido'; // snake_case
type apiResponse<T> = { }; // camelCase
```

---

## Hooks

### Custom Hooks

- **Formato**: `camelCase` com prefixo `use`
- **Nomes descritivos**: Descreva o que o hook faz

**Exemplos:**
```typescript
// ✅ Correto
function useClientes(filters?: ClienteFilters) { }
function useDashboard() { }
function useTable<T>(options: UseTableOptions<T>) { }
function useClienteForm(clienteId?: number) { }

// ❌ Incorreto
function use_clientes() { } // snake_case
function UseClientes() { } // PascalCase
function useClients() { } // Inglês inconsistente (se projeto é em português)
```

### Hooks de Estado

- **Formato**: `camelCase` com prefixo `use`
- **Seguir convenções do React**

**Exemplos:**
```typescript
// ✅ Correto
const [clientes, setClientes] = useState<Cliente[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [selectedItems, setSelectedItems] = useState<Cliente[]>([]);

// ❌ Incorreto
const [Clientes, setClientes] = useState([]); // PascalCase
const [is_loading, setIsLoading] = useState(false); // snake_case
```

---

## Classes

### Classes

- **Formato**: `PascalCase`
- **Nomes descritivos**: Substantivos que descrevam a responsabilidade

**Exemplos:**
```typescript
// ✅ Correto
class ClienteService { }
class VariaveisDocumentoService { }
class RoutineExecutionService { }

// ❌ Incorreto
class clienteService { } // camelCase
class variaveis_documento_service { } // snake_case
```

### Propriedades de Classe

- **Formato**: `camelCase`
- **Mesmas regras das variáveis**

**Exemplos:**
```typescript
class ClienteService {
  private baseUrl: string;
  private maxRetries: number;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.maxRetries = 3;
  }
}
```

---

## Constantes

### Constantes Globais

- **Formato**: `UPPER_SNAKE_CASE`
- **Valores imutáveis**

**Exemplos:**
```typescript
// ✅ Correto
const MAX_RETRIES = 3;
const DEFAULT_PAGE_SIZE = 15;
const API_TIMEOUT = 30000;

// ❌ Incorreto
const maxRetries = 3; // camelCase
const defaultPageSize = 15;
```

### Enums

- **Formato**: `PascalCase`
- **Valores**: `UPPER_SNAKE_CASE` ou `PascalCase`

**Exemplos:**
```typescript
// ✅ Correto
enum StatusTitulo {
  PENDENTE = 'pendente',
  VENCIDO = 'vencido',
  PAGO = 'pago'
}

enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

// ❌ Incorreto
enum status_titulo { } // snake_case
enum StatusTitulo {
  pendente = 'pendente' // camelCase para valores
}
```

---

## Regras Especiais

### Prefixos Comuns

- **Handlers**: `handle` (ex: `handleSubmit`, `handleClick`)
- **Callbacks**: `on` (ex: `onClose`, `onChange`, `onSuccess`)
- **Booleans**: `is`, `has`, `should`, `can` (ex: `isActive`, `hasPermission`)
- **Getters**: `get` (ex: `getClienteById`)
- **Setters**: `set` (ex: `setCliente`)
- **Validators**: `validate` (ex: `validateForm`)
- **Formatters**: `format` (ex: `formatDate`, `formatCurrency`)

### Convenções de Banco de Dados

- **Tabelas**: `snake_case` plural (ex: `clientes`, `titulos`)
- **Colunas**: `snake_case` (ex: `razao_social`, `data_vencimento`)
- **Foreign Keys**: `{tabela}_id` (ex: `cliente_id`, `plano_id`)

### Convenções de API

- **Endpoints**: `kebab-case` ou `snake_case` (ex: `/api/clientes`, `/api/titulos`)
- **Query Parameters**: `snake_case` (ex: `cliente_id`, `data_inicio`)
- **Request/Response**: Seguir convenções de tipos TypeScript

---

## Ferramentas de Validação

### ESLint

As convenções de nomenclatura são automaticamente validadas pelo ESLint através da regra `@typescript-eslint/naming-convention` configurada em `frontend/.eslintrc.json`.

**Regras configuradas:**
- ✅ Interfaces e Types em `PascalCase`
- ✅ Classes em `PascalCase`
- ✅ Variáveis e funções em `camelCase`
- ✅ Constantes em `UPPER_SNAKE_CASE`
- ✅ Componentes React em `PascalCase`

**Como usar:**
```bash
# Verificar erros de nomenclatura
npm run lint

# Corrigir automaticamente quando possível
npm run lint:fix
```

### Path Aliases

Path aliases foram configurados no `tsconfig.json` para facilitar imports e manter consistência:

```typescript
// ✅ Usando path aliases (recomendado)
import { useClientes } from '@/hooks/useClientes';
import { ClienteModal } from '@/components/modals/clientes/ClienteModal';

// ❌ Imports relativos profundos (evitar)
import { useClientes } from '../../../hooks/useClientes';
```

**Aliases disponíveis:**
- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/hooks/*` → `src/hooks/*`
- `@/services/*` → `src/services/*`
- `@/types/*` → `src/types/*`
- `@/utils/*` → `src/utils/*`
- `@/contexts/*` → `src/contexts/*`
- `@/constants/*` → `src/constants/*`

---

## Checklist de Verificação

Ao criar ou modificar código, verifique:

- [ ] Variáveis em `camelCase`
- [ ] Constantes em `UPPER_SNAKE_CASE`
- [ ] Componentes em `PascalCase`
- [ ] Funções em `camelCase` com verbos descritivos
- [ ] Handlers com prefixo `handle`
- [ ] Booleans com prefixo `is`, `has`, `should` ou `can`
- [ ] Interfaces/Types em `PascalCase`
- [ ] Props com sufixo `Props`
- [ ] Hooks com prefixo `use`
- [ ] Classes em `PascalCase`
- [ ] Arquivos seguindo convenções de nomenclatura
- [ ] ESLint não reporta erros de nomenclatura
- [ ] Imports usando path aliases quando apropriado

---

**Última atualização:** 2025-01-22
**Versão:** 1.1

