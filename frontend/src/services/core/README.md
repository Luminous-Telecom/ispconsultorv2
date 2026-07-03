# Core Services - Sistema de API Unificado

Este diretório contém a estrutura base para serviços de API unificados do ISP Consultor.

## 📁 Estrutura

```
core/
├── ApiClient.ts          # Cliente HTTP unificado
├── ErrorHandler.ts       # Tratamento centralizado de erros
├── ResponseTransformer.ts # Transformação de respostas
├── BaseService.ts        # Classe base abstrata para serviços
├── ServiceFactory.ts     # Factory para criar serviços
└── index.ts              # Exportações centralizadas
```

## 🚀 Como Usar

### 1. Criar um Serviço Usando BaseService

```typescript
import { BaseService, defaultApiClient } from './core';
import { Cliente, CreateCliente, UpdateCliente, ClienteFilters } from '../../types';

export class ClienteService extends BaseService<
  Cliente,
  CreateCliente,
  UpdateCliente,
  ClienteFilters
> {
  constructor() {
    super(defaultApiClient, '/clientes');
  }

  // Métodos customizados podem ser adicionados aqui
  async getByCnpj(cnpj: string) {
    return this.customGet<Cliente>(`/cnpj/${cnpj}`);
  }
}

// Instância única do serviço
export const clienteService = new ClienteService();
```

### 2. Usar o Serviço

```typescript
import { clienteService } from './services/clienteService';

// Listar com filtros e paginação
const response = await clienteService.list({ search: 'empresa', page: 1, limit: 15 });

// Buscar por ID
const cliente = await clienteService.getById(1);

// Criar
const novoCliente = await clienteService.create({ nome: 'Empresa', ... });

// Atualizar
await clienteService.update(1, { nome: 'Novo Nome' });

// Deletar
await clienteService.delete(1);
```

## 📋 Componentes

### ApiClient

Cliente HTTP unificado com:
- Interceptors para autenticação automática
- Tratamento de erros centralizado
- Normalização de respostas
- Upload de arquivos com progresso

**Exemplo de uso direto:**
```typescript
import { defaultApiClient } from './core';

const response = await defaultApiClient.get<Cliente>('/clientes/1');
const created = await defaultApiClient.post('/clientes', data);
```

### ErrorHandler

Tratamento padronizado de erros da API:
- Classificação automática de tipos de erro
- Mensagens amigáveis
- Extração de erros de validação

**Tipos de erro:**
- `NETWORK_ERROR` - Erro de conexão
- `TIMEOUT_ERROR` - Tempo expirado
- `VALIDATION_ERROR` - Erro de validação (400)
- `AUTHENTICATION_ERROR` - Não autenticado (401)
- `AUTHORIZATION_ERROR` - Sem permissão (403)
- `NOT_FOUND_ERROR` - Recurso não encontrado (404)
- `SERVER_ERROR` - Erro do servidor (500+)
- `UNKNOWN_ERROR` - Erro desconhecido

**Exemplo:**
```typescript
import { ErrorHandler, ErrorType } from './core';

try {
  await clienteService.create(data);
} catch (error) {
  const apiError = ErrorHandler.processError(error);
  
  if (ErrorHandler.isErrorType(apiError, ErrorType.VALIDATION_ERROR)) {
    const validationErrors = ErrorHandler.getValidationErrors(apiError);
    // Tratar erros de validação
  }
}
```

### ResponseTransformer

Transformação e normalização de respostas:
- `toApiResponse()` - Normaliza para ApiResponse
- `toPaginatedResponse()` - Transforma para formato paginado
- `normalize()` - Normaliza qualquer resposta
- `extractData()` - Extrai apenas os dados

### BaseService

Classe base abstrata com métodos CRUD padrão:
- `list(filters?)` - Lista com filtros e paginação
- `getById(id)` - Busca por ID
- `create(data)` - Cria nova entidade
- `update(id, data)` - Atualiza entidade
- `delete(id)` - Deleta entidade
- `customGet(endpoint, config?)` - Método GET customizado (protegido)
- `customPost(endpoint, data?)` - Método POST customizado (protegido)

### ServiceFactory

Factory para criar múltiplos serviços de uma vez:

```typescript
import { ServiceFactory } from './core';

const services = ServiceFactory.createServices({
  clientes: {
    ServiceClass: ClienteService,
    config: { endpoint: '/clientes' }
  },
  planos: {
    ServiceClass: PlanoService,
    config: { endpoint: '/planos' }
  }
});
```

## 🔄 Migração de Serviços Existentes

Para migrar um serviço existente:

1. **Substituir classe estática por instância:**
```typescript
// Antes
export class ClienteService {
  static async list() { ... }
}

// Depois
export class ClienteService extends BaseService<...> {
  constructor() {
    super(defaultApiClient, '/clientes');
  }
}
```

2. **Métodos padrão são herdados automaticamente:**
- `list()`, `getById()`, `create()`, `update()`, `delete()` não precisam ser implementados

3. **Métodos customizados usam métodos protegidos:**
```typescript
async getByCnpj(cnpj: string) {
  return this.customGet<Cliente>(`/cnpj/${cnpj}`);
}
```

4. **Tratamento de erros é automático:**
- Erros são automaticamente transformados em `ApiError`
- Não precisa mais de try/catch manual (a menos que queira tratamento específico)

## 📝 Notas Importantes

- Todos os serviços retornam `ApiResponse<T>` ou `PaginatedResponse<T>`
- Erros são automaticamente transformados em `ApiError`
- Autenticação é automática via interceptors
- Respostas são normalizadas automaticamente

## 🔗 Ver Também

- [Hooks Customizados](../../hooks/useApi.ts)
- [Tipos de API](../../types/index.ts)

