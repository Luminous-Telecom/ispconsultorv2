# Schemas de Validação - BackNet ERP

Este diretório contém schemas centralizados de validação usando **Zod**, separando as regras de validação da interface do usuário.

## Estrutura

### `brazilian-documents.schema.ts`
Schemas reutilizáveis para validação de documentos brasileiros:
- **CPF**: Validação completa com algoritmo de dígitos verificadores
- **CNPJ**: Validação completa com algoritmo de dígitos verificadores
- **CEP**: Validação de formato (8 dígitos)
- **Telefone**: Validação de telefone brasileiro (10 ou 11 dígitos)
- **Email**: Validação de formato de email
- **Estado (UF)**: Validação de estado brasileiro (2 caracteres)

### `cliente.schema.ts`
Schema completo para validação de Cliente:
- Importa validações reutilizáveis de `brazilian-documents.schema.ts`
- Define todas as regras de validação para criação e atualização
- Exporta tipos TypeScript inferidos do schema

## Como Usar

### 1. Instalação

As dependências já estão instaladas:
```bash
npm install zod @hookform/resolvers react-hook-form
```

### 2. Usando em um Hook com React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '../schemas/cliente.schema';

const {
  register,
  handleSubmit,
  formState: { errors },
  watch,
  setValue
} = useForm<ClienteFormData>({
  resolver: zodResolver(clienteSchema),
  defaultValues: {
    cnpj: '',
    razao_social: '',
    // ... outros campos
  },
  mode: 'onChange' // Validação em tempo real
});

const onSubmit = (data: ClienteFormData) => {
  // data já está validado pelo Zod
  console.log(data);
};
```

### 3. Usando em um Componente

```typescript
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ClienteFormData } from '../schemas/cliente.schema';

interface Props {
  register: UseFormRegister<ClienteFormData>;
  errors: FieldErrors<ClienteFormData>;
}

const MeuComponente: React.FC<Props> = ({ register, errors }) => {
  return (
    <div>
      <input
        {...register('cnpj')}
        placeholder="CNPJ"
      />
      {errors.cnpj && <span>{errors.cnpj.message}</span>}
    </div>
  );
};
```

### 4. Reutilizando Validações de Documentos Brasileiros

```typescript
import { cpfSchema, cnpjSchema, cepSchema } from '../schemas/brazilian-documents.schema';
import { z } from 'zod';

// Criar um schema customizado usando validações reutilizáveis
const meuSchema = z.object({
  cpf: cpfSchema,
  cnpj: cnpjSchema,
  cep: cepSchema.optional(), // CEP opcional
});
```

## Vantagens

✅ **Centralização**: Todas as regras de validação em um único lugar  
✅ **Reutilização**: Validações de documentos brasileiros podem ser importadas em qualquer schema  
✅ **Type Safety**: Tipos TypeScript inferidos automaticamente do schema  
✅ **Validação em Tempo Real**: Integração perfeita com React Hook Form  
✅ **Mensagens de Erro**: Mensagens de erro personalizadas e consistentes  
✅ **Manutenibilidade**: Fácil de manter e atualizar regras de validação  

## Exemplos de Refatoração

Veja os arquivos de exemplo:
- `../hooks/useClienteFormWithZod.example.ts` - Hook refatorado usando React Hook Form + Zod
- `../components/modals/clientes/cliente/abas/DadosBasicosTabWithZod.example.tsx` - Componente refatorado

## Próximos Passos

1. Refatorar `useClienteForm.ts` para usar React Hook Form + Zod
2. Atualizar componentes de formulário para usar `register()` e `formState.errors`
3. Criar schemas para outras entidades (Plano, Contrato, Título, etc.)
4. Adicionar validações customizadas conforme necessário

