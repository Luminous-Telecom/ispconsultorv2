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

### Schemas de Entidades

#### `cliente.schema.ts`
Schema completo para validação de Cliente:
- Importa validações reutilizáveis de `brazilian-documents.schema.ts`
- Define todas as regras de validação para criação e atualização
- Exporta tipos TypeScript inferidos do schema
- ✅ **Hook refatorado**: `useClienteForm.ts`

#### `plano.schema.ts`
Schema completo para validação de Plano:
- Validações para valores, descontos, periodicidade
- Validação de datas e status
- ✅ **Hook refatorado**: `usePlanoForm.ts`

#### `contrato.schema.ts`
Schema completo para validação de Contrato:
- Validações para relacionamentos obrigatórios
- Validação de descontos e datas
- ✅ **Hook refatorado**: `useContratoForm.ts`

#### `titulo.schema.ts`
Schema completo para validação de Título:
- Validações para valores, descontos e acréscimos
- Validação de datas e status
- ✅ **Hook refatorado**: `useTituloForm.ts`

#### `banco.schema.ts`
Schema completo para validação de Banco:
- Validações para configurações de API
- Validações para configurações financeiras e de layout
- ✅ **Hook refatorado**: `useBancoForm.ts`

#### `receber.schema.ts`
Schema completo para validação de ReceberModal:
- Validação de data de pagamento (não pode ser futura)
- Validação de valor pago (deve ser maior que zero)
- ✅ **Componente refatorado**: `ReceberModal.tsx` (usa React Hook Form diretamente)

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

## ✅ Status da Implementação

### Entidades Refatoradas

Todas as entidades principais e secundárias foram refatoradas:

1. ✅ **Cliente** - `useClienteForm.ts` + `cliente.schema.ts`
2. ✅ **Plano** - `usePlanoForm.ts` + `plano.schema.ts`
3. ✅ **Contrato** - `useContratoForm.ts` + `contrato.schema.ts`
4. ✅ **Título** - `useTituloForm.ts` + `titulo.schema.ts`
5. ✅ **Banco** - `useBancoForm.ts` + `banco.schema.ts`
6. ✅ **ReceberModal** - React Hook Form direto + `receber.schema.ts`

### Exemplos de Implementação

Veja os hooks refatorados em produção:
- `../hooks/useClienteForm.ts` - Hook completo usando React Hook Form + Zod
- `../hooks/usePlanoForm.ts` - Hook completo usando React Hook Form + Zod
- `../hooks/useContratoForm.ts` - Hook completo usando React Hook Form + Zod
- `../hooks/useTituloForm.ts` - Hook completo usando React Hook Form + Zod
- `../hooks/useBancoForm.ts` - Hook completo usando React Hook Form + Zod

Veja os componentes refatorados:
- `../components/modals/clientes/cliente/ClienteModal.tsx` - Usa `useClienteForm`
- `../components/modals/planos/PlanoModal.tsx` - Usa `usePlanoForm`
- `../components/modals/clientes/contrato/ContratoModal.tsx` - Usa `useContratoForm`
- `../components/modals/titulos/titulo/TituloModal.tsx` - Usa `useTituloForm`
- `../components/modals/bancos/BancoModal.tsx` - Usa `useBancoForm`
- `../components/modals/pagamentos/ReceberModal.tsx` - Usa React Hook Form diretamente

## 📚 Documentação Adicional

- Veja `IMPLEMENTACAO_ZOD_VALIDATION.md` na raiz do projeto para documentação completa
- Veja `MIGRACAO_GRADUAL.md` para guia de migração (já completo)

