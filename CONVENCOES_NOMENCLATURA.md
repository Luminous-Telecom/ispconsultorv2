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
8. [Constantes e Enums](#constantes-e-enums)
9. [Regras Especiais](#regras-especiais)
10. [Checklist de Verificação](#checklist-de-verificação)

---

## Arquivos

### Frontend

#### Componentes React
- **Formato**: `PascalCase.tsx`
- **Localização**: `src/components/`
- **Exemplos do projeto**:
  - `ClienteModal.tsx`
  - `TableColumn.tsx`
  - `Dashboard.tsx`
  - `BancoListModal.tsx`

#### Hooks Customizados
- **Formato**: `camelCase.ts` com prefixo `use`
- **Localização**: `src/hooks/`
- **Exemplos do projeto**:
  - `useClientes.ts`
  - `useDashboard.ts`
  - `useTableFilters.ts`
  - `useClienteForm.ts`

#### Services
- **Formato**: `camelCase.ts`
- **Localização**: `src/services/`
- **Exemplos do projeto**:
  - `clienteService.ts`
  - `tituloService.ts`
  - `authService.ts`
  - `contratoService.ts`
  - `termoContratoService.ts`

#### Types e Interfaces
- **Formato**: `camelCase.ts` ou `kebab-case.ts`
- **Localização**: `src/types/`
- **Exemplos do projeto**:
  - `entities.ts`
  - `api.ts`
  - `common.ts`

#### Utils
- **Formato**: `camelCase.ts`
- **Localização**: `src/utils/`
- **Exemplos do projeto**:
  - `formatters.ts`
  - `validators.ts`

#### Schemas (Validação)
- **Formato**: `camelCase.schema.ts` ou `kebab-case.schema.ts`
- **Localização**: `src/schemas/`
- **Exemplos do projeto**:
  - `brazilian-documents.schema.ts`

#### Contexts
- **Formato**: `PascalCase.tsx` ou `PascalCase.ts`
- **Localização**: `src/contexts/`
- **Exemplos do projeto**:
  - `ThemeContext.tsx`
  - `DashboardFiltersContext.tsx`

### Backend

#### Controllers
- **Formato**: `PascalCase.ts`
- **Localização**: `src/controllers/`
- **Exemplos do projeto**:
  - `ClienteController.ts`
  - `TituloController.ts`

#### Services
- **Formato**: `PascalCase.ts`
- **Localização**: `src/services/`
- **Exemplos do projeto**:
  - `ClienteService.ts`
  - `VariaveisDocumentoService.ts`
  - `FinancialCalculationsService.ts`
  - `RoutineExecutionService.ts`

#### Models
- **Formato**: `PascalCase.ts`
- **Localização**: `src/models/`
- **Exemplos do projeto**:
  - `Cliente.ts`
  - `Titulo.ts`
  - `Contrato.ts`

#### Migrations
- **Formato**: `YYYYMMDDHHMMSS-description.js` (sempre JavaScript)
- **Localização**: `src/migrations/`
- **Exemplos do projeto**:
  - `20240101120000-create-clientes.js`

---

## Variáveis e Constantes

### Variáveis

**Formato**: `camelCase`

**Regras**:
- Use nomes descritivos (evite abreviações desnecessárias)
- Booleans: Use prefixos `is`, `has`, `should`, `can`
- Arrays: Use plural ou sufixo `List`
- Objetos: Use substantivos no singular

**Exemplos**:
```typescript
// ✅ Correto
const cliente = { id: 1, nome: 'João' };
const clientes = [cliente1, cliente2];
const isActive = true;
const hasPermission = false;
const shouldValidate = true;
const canEdit = false;
const titulosList: Titulo[] = [];
const selectedItems: Cliente[] = [];
const isLoading = false;
const showModal = true;

// ❌ Incorreto
const cli = { id: 1 }; // Abreviação
const active = true; // Sem prefixo para boolean
const titulos_array = []; // snake_case
const SelectedItems = []; // PascalCase para variável
const loading = false; // Sem prefixo is/has
```

### Constantes

**Formato**: `UPPER_SNAKE_CASE`

**Uso**: Valores que não mudam durante a execução

**Exemplos**:
```typescript
// ✅ Correto
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 15;
const API_TIMEOUT = 30000;

// ❌ Incorreto
const maxRetries = 3; // camelCase para constante
const apiBaseUrl = 'https://api.example.com';
const defaultPageSize = 15;
```

---

## Funções e Métodos

### Funções

**Formato**: `camelCase`

**Regras**:
- Verbos no infinitivo: `get`, `create`, `update`, `delete`, `validate`
- Handlers: Prefixo `handle`
- Callbacks: Prefixo `on` quando apropriado

**Exemplos**:
```typescript
// ✅ Correto
function getClienteById(id: number): Cliente { }
function createTitulo(data: CreateTituloData): Promise<Titulo> { }
function updateContrato(id: number, data: UpdateContratoData): Promise<Contrato> { }
function deletePlano(id: number): Promise<void> { }
function validateForm(data: FormData): boolean { }
function handleSubmit(event: FormEvent): void { }
function onSelectionChange(items: Cliente[]): void { }
function formatDate(date: Date): string { }
function extractApiErrorMessage(error: unknown): string { }

// ❌ Incorreto
function GetClienteById(id: number) { } // PascalCase
function criar_titulo(data: CreateTituloData) { } // snake_case
function submit(event: FormEvent) { } // Sem prefixo handle
function SubmitHandler(event: FormEvent) { } // PascalCase + sem prefixo
```

### Métodos de Classe

**Formato**: `camelCase`

**Mesmas regras das funções**

**Exemplos**:
```typescript
// ✅ Correto
class ClienteService {
  async list(filters?: ClienteFilters): Promise<PaginatedResponse<Cliente>> { }
  async getById(id: number): Promise<Cliente> { }
  async create(data: CreateCliente): Promise<Cliente> { }
  async update(id: number, data: UpdateCliente): Promise<Cliente> { }
  async delete(id: number): Promise<void> { }
  private validateData(data: CreateCliente): boolean { }
}

// ❌ Incorreto
class ClienteService {
  async List(filters?: ClienteFilters) { } // PascalCase
  async criar_cliente(data: CreateCliente) { } // snake_case
}
```

---

## Componentes React

### Componentes Funcionais

**Formato**: `PascalCase`

**Regras**:
- Use substantivos que descrevam o propósito
- Use `React.FC<Props>` ou tipagem explícita

**Exemplos**:
```typescript
// ✅ Correto
const ClienteModal: React.FC<ClienteModalProps> = ({ show, onClose }) => { };
const TableColumn = <T>({ column }: TableColumnProps<T>) => { };
const Dashboard: React.FC = () => { };
const Loading: React.FC<LoadingProps> = ({ message }) => { };

// ❌ Incorreto
const clienteModal = () => { }; // camelCase
const table_column = () => { }; // snake_case
const Cliente_Modal = () => { }; // snake_case com PascalCase
```

### Props de Componentes

**Formato**: `PascalCase` com sufixo `Props`

**Regras**:
- Interface ou type em `PascalCase`
- Sempre use sufixo `Props` para props de componentes

**Exemplos**:
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

interface LoadingProps {
  message?: string;
}

// ❌ Incorreto
interface clienteModalProps { } // camelCase
interface ClienteModal { } // Sem sufixo Props
type table_column_props = { }; // snake_case
```

---

## Tipos e Interfaces

### Interfaces

**Formato**: `PascalCase`

**Regras**:
- Sem prefixo `I` (não use `ICliente`, use `Cliente`)
- Props: Sufixo `Props`
- Config: Sufixo `Config`
- Filters: Sufixo `Filters`
- DTOs: Prefixo `Create`, `Update` ou sufixo `Data`

**Exemplos**:
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

interface ClienteFilters {
  search?: string;
  status?: string;
}

interface CreateClienteData {
  razao_social: string;
  cnpj: string;
}

interface UpdateClienteData {
  razao_social?: string;
}

// ❌ Incorreto
interface ICliente { } // Prefixo I
interface cliente { } // camelCase
interface cliente_modal_props { } // snake_case
interface ClienteDTO { } // Sufixo DTO (use CreateClienteData)
```

### Types

**Formato**: `PascalCase`

**Mesmas regras das interfaces**

**Exemplos**:
```typescript
// ✅ Correto
type StatusTitulo = 'pendente' | 'vencido' | 'pago';
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

// ❌ Incorreto
type status_titulo = 'pendente' | 'vencido'; // snake_case
type apiResponse<T> = { }; // camelCase
```

---

## Hooks

### Custom Hooks

**Formato**: `camelCase` com prefixo `use`

**Regras**:
- Sempre comece com `use`
- Descreva o que o hook faz
- Retorne objetos nomeados, não arrays (quando possível)

**Exemplos**:
```typescript
// ✅ Correto
function useClientes(filters?: ClienteFilters) { }
function useDashboard() { }
function useTable<T>(options: UseTableOptions<T>) { }
function useClienteForm(clienteId?: number) { }
function useTableFilters(options: UseTableFiltersOptions) { }
function useSorting<T>(data: T[], column: string, direction: 'asc' | 'desc') { }

// ❌ Incorreto
function use_clientes() { } // snake_case
function UseClientes() { } // PascalCase
function useClients() { } // Inglês inconsistente (se projeto é em português)
function getClientes() { } // Sem prefixo use
```

### Hooks de Estado

**Formato**: `camelCase` com prefixo `use`

**Regras**:
- Seguir convenções do React
- Use prefixos `is`, `has`, `should`, `can` para booleans

**Exemplos**:
```typescript
// ✅ Correto
const [clientes, setClientes] = useState<Cliente[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [selectedItems, setSelectedItems] = useState<Cliente[]>([]);
const [hasError, setHasError] = useState(false);
const [showModal, setShowModal] = useState(false);

// ❌ Incorreto
const [Clientes, setClientes] = useState([]); // PascalCase
const [is_loading, setIsLoading] = useState(false); // snake_case
const [loading, setLoading] = useState(false); // Sem prefixo is/has
```

---

## Classes

### Classes

**Formato**: `PascalCase`

**Regras**:
- Use substantivos que descrevam a responsabilidade
- Services: Sufixo `Service`
- Controllers: Sufixo `Controller`
- Handlers: Sufixo `Handler`

**Exemplos**:
```typescript
// ✅ Correto
class ClienteService { }
class VariaveisDocumentoService { }
class RoutineExecutionService { }
class FinancialCalculationsService { }
class ErrorHandler { }

// ❌ Incorreto
class clienteService { } // camelCase
class variaveis_documento_service { } // snake_case
class Cliente_Service { } // snake_case com PascalCase
```

### Propriedades de Classe

**Formato**: `camelCase`

**Mesmas regras das variáveis**

**Exemplos**:
```typescript
// ✅ Correto
class ClienteService {
  private baseUrl: string;
  private maxRetries: number;
  private isInitialized: boolean;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.maxRetries = 3;
    this.isInitialized = false;
  }
}

// ❌ Incorreto
class ClienteService {
  private BaseUrl: string; // PascalCase
  private max_retries: number; // snake_case
}
```

---

## Constantes e Enums

### Constantes Globais

**Formato**: `UPPER_SNAKE_CASE`

**Regras**:
- Valores imutáveis
- Use para configurações e valores constantes

**Exemplos**:
```typescript
// ✅ Correto
const MAX_RETRIES = 3;
const DEFAULT_PAGE_SIZE = 15;
const API_TIMEOUT = 30000;
const DEFAULT_DATE_FORMAT = 'DD/MM/YYYY';

// ❌ Incorreto
const maxRetries = 3; // camelCase
const defaultPageSize = 15;
```

### Enums

**Formato**: `PascalCase` para o enum, `UPPER_SNAKE_CASE` ou `PascalCase` para valores

**Exemplos**:
```typescript
// ✅ Correto
enum StatusTitulo {
  PENDENTE = 'pendente',
  VENCIDO = 'vencido',
  PAGO = 'pago'
}

enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
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

| Prefixo | Uso | Exemplos |
|---------|-----|----------|
| `handle` | Handlers de eventos | `handleSubmit`, `handleClick`, `handleChange` |
| `on` | Callbacks e props | `onClose`, `onChange`, `onSuccess`, `onError` |
| `is` | Booleans (estado) | `isActive`, `isLoading`, `isOpen`, `isValid` |
| `has` | Booleans (posse) | `hasPermission`, `hasError`, `hasData` |
| `should` | Booleans (condição) | `shouldValidate`, `shouldRender` |
| `can` | Booleans (capacidade) | `canEdit`, `canDelete`, `canView` |
| `get` | Getters | `getClienteById`, `getFormattedDate` |
| `set` | Setters | `setCliente`, `setIsLoading` |
| `validate` | Validações | `validateForm`, `validateEmail` |
| `format` | Formatação | `formatDate`, `formatCurrency`, `formatCnpj` |
| `create` | Criação | `createCliente`, `createTitulo` |
| `update` | Atualização | `updateCliente`, `updateTitulo` |
| `delete` | Remoção | `deleteCliente`, `deleteTitulo` |

### Sufixos Comuns

| Sufixo | Uso | Exemplos |
|--------|-----|----------|
| `Props` | Props de componentes | `ClienteModalProps`, `TableColumnProps` |
| `Config` | Configurações | `TableConfig`, `ApiConfig` |
| `Filters` | Filtros | `ClienteFilters`, `TituloFilters` |
| `Data` | DTOs de criação/atualização | `CreateClienteData`, `UpdateTituloData` |
| `Service` | Services | `ClienteService`, `TituloService` |
| `Controller` | Controllers | `ClienteController`, `TituloController` |
| `Handler` | Handlers | `ErrorHandler`, `VariableHandler` |

### Convenções de Banco de Dados

- **Tabelas**: `snake_case` plural
  - Exemplo: `clientes`, `titulos`, `contratos`
- **Colunas**: `snake_case`
  - Exemplo: `razao_social`, `data_vencimento`, `created_at`
- **Foreign Keys**: `{tabela}_id`
  - Exemplo: `cliente_id`, `plano_id`, `banco_id`
- **Timestamps**: `created_at`, `updated_at`

### Convenções de API

- **Endpoints**: `kebab-case` ou `snake_case`
  - Exemplo: `/api/clientes`, `/api/titulos`, `/api/termos-contrato`
- **Query Parameters**: `snake_case`
  - Exemplo: `cliente_id`, `data_inicio`, `data_fim`, `page`, `limit`
- **Request/Response**: Seguir convenções de tipos TypeScript
  - Request: `CreateClienteData`, `UpdateTituloData`
  - Response: `ApiResponse<T>`, `PaginatedResponse<T>`

---

## Checklist de Verificação

Ao criar ou modificar código, verifique:

### Arquivos
- [ ] Nome do arquivo segue a convenção (`PascalCase` para componentes, `camelCase` para hooks/services)
- [ ] Extensão correta (`.tsx` para componentes React, `.ts` para outros)

### Variáveis e Constantes
- [ ] Variáveis em `camelCase`
- [ ] Constantes em `UPPER_SNAKE_CASE`
- [ ] Booleans com prefixo `is`, `has`, `should` ou `can`
- [ ] Arrays em plural ou com sufixo `List`

### Funções e Métodos
- [ ] Funções em `camelCase` com verbos descritivos
- [ ] Handlers com prefixo `handle`
- [ ] Callbacks com prefixo `on`
- [ ] Métodos de classe seguem as mesmas regras

### Componentes React
- [ ] Componentes em `PascalCase`
- [ ] Props com sufixo `Props`
- [ ] Props tipadas corretamente

### Tipos e Interfaces
- [ ] Interfaces/Types em `PascalCase`
- [ ] Sem prefixo `I` em interfaces
- [ ] Props com sufixo `Props`
- [ ] Configs com sufixo `Config`
- [ ] Filters com sufixo `Filters`
- [ ] DTOs com prefixo `Create`/`Update` ou sufixo `Data`

### Hooks
- [ ] Hooks com prefixo `use`
- [ ] Hooks em `camelCase`
- [ ] Estado com prefixos apropriados (`is`, `has`, etc.)

### Classes
- [ ] Classes em `PascalCase`
- [ ] Propriedades em `camelCase`
- [ ] Services com sufixo `Service`
- [ ] Controllers com sufixo `Controller`

### Constantes e Enums
- [ ] Constantes em `UPPER_SNAKE_CASE`
- [ ] Enums em `PascalCase`
- [ ] Valores de enum em `UPPER_SNAKE_CASE` ou `PascalCase`

---

**Última atualização:** 2025-01-22  
**Versão:** 2.0
