# Implementação de Validação Centralizada com Zod

## ✅ O que foi implementado

### 1. Dependências Instaladas
- ✅ `zod` - Biblioteca de validação de schemas
- ✅ `@hookform/resolvers` - Resolver para integrar Zod com React Hook Form
- ✅ `react-hook-form` - Biblioteca para gerenciamento de formulários

### 2. Schemas Criados

#### `frontend/src/schemas/brazilian-documents.schema.ts`
Schemas reutilizáveis para documentos brasileiros:
- ✅ **CPF**: Validação completa com algoritmo de dígitos verificadores
- ✅ **CNPJ**: Validação completa com algoritmo de dígitos verificadores  
- ✅ **CEP**: Validação de formato (8 dígitos)
- ✅ **Telefone**: Validação de telefone brasileiro (10 ou 11 dígitos)
- ✅ **Email**: Validação de formato de email
- ✅ **Estado (UF)**: Validação de estado brasileiro (2 caracteres)

#### `frontend/src/schemas/cliente.schema.ts`
Schema completo para validação de Cliente:
- ✅ Importa validações reutilizáveis de documentos brasileiros
- ✅ Define todas as regras de validação para criação e atualização
- ✅ Exporta tipos TypeScript inferidos automaticamente
- ✅ Suporta campos opcionais e strings vazias

### 3. Exemplos de Refatoração

#### `frontend/src/hooks/useClienteFormWithZod.example.ts`
Exemplo completo de como refatorar o hook `useClienteForm` para usar:
- React Hook Form para gerenciamento de estado
- Zod para validação centralizada
- zodResolver para integração

#### `frontend/src/components/modals/clientes/cliente/abas/DadosBasicosTabWithZod.example.tsx`
Exemplo de como refatorar componentes de formulário para usar:
- `register()` do React Hook Form
- `formState.errors` para exibir erros
- Validação automática via Zod

## 📋 Como Usar

### Passo 1: Importar o Schema

```typescript
import { clienteSchema, ClienteFormData } from '../schemas/cliente.schema';
```

### Passo 2: Configurar React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const {
  register,
  handleSubmit,
  formState: { errors },
  watch,
  setValue,
  reset
} = useForm<ClienteFormData>({
  resolver: zodResolver(clienteSchema),
  defaultValues: {
    cnpj: '',
    razao_social: '',
    email: '',
    // ... outros campos
  },
  mode: 'onChange' // Validação em tempo real
});
```

### Passo 3: Usar no Componente

```typescript
<input
  {...register('cnpj')}
  placeholder="CNPJ"
/>
{errors.cnpj && <span className="text-danger">{errors.cnpj.message}</span>}
```

### Passo 4: Handler de Submit

```typescript
const onSubmit = (data: ClienteFormData) => {
  // data já está validado pelo Zod
  console.log(data);
};

<form onSubmit={handleSubmit(onSubmit)}>
  {/* campos do formulário */}
</form>
```

## 🔄 Próximos Passos para Refatoração Completa

### 1. Refatorar `useClienteForm.ts`
- Substituir estado manual por React Hook Form
- Usar `clienteSchema` para validação
- Manter funcionalidades existentes (consulta CNPJ/CEP)

### 2. Atualizar Componentes de Aba
- `DadosBasicosTab.tsx`
- `ContatoTab.tsx`
- `EnderecoTab.tsx`
- `ObservacoesTab.tsx`

### 3. Criar Schemas para Outras Entidades
- `plano.schema.ts`
- `contrato.schema.ts`
- `titulo.schema.ts`

## 📚 Documentação Adicional

Veja `frontend/src/schemas/README.md` para mais detalhes sobre:
- Como reutilizar validações de documentos brasileiros
- Como criar novos schemas
- Boas práticas de validação

## ✨ Vantagens da Implementação

✅ **Centralização**: Todas as regras de validação em um único lugar  
✅ **Reutilização**: Validações de documentos brasileiros podem ser importadas em qualquer schema  
✅ **Type Safety**: Tipos TypeScript inferidos automaticamente do schema  
✅ **Validação em Tempo Real**: Integração perfeita com React Hook Form  
✅ **Mensagens de Erro**: Mensagens de erro personalizadas e consistentes  
✅ **Manutenibilidade**: Fácil de manter e atualizar regras de validação  
✅ **Testabilidade**: Schemas podem ser testados independentemente  

## 🎯 Exemplo Completo de Uso

```typescript
// Hook
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '../schemas/cliente.schema';

const MyFormHook = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    mode: 'onChange'
  });

  const onSubmit = (data: ClienteFormData) => {
    // data validado automaticamente
    console.log(data);
  };

  return { register, handleSubmit, errors, onSubmit };
};

// Componente
const MyForm = () => {
  const { register, handleSubmit, errors, onSubmit } = MyFormHook();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('cnpj')} />
      {errors.cnpj && <span>{errors.cnpj.message}</span>}
      
      <input {...register('razao_social')} />
      {errors.razao_social && <span>{errors.razao_social.message}</span>}
      
      <button type="submit">Salvar</button>
    </form>
  );
};
```

## 📝 Notas Importantes

1. **Campos Opcionais**: Campos como `nome_fantasia`, `telefone`, `whatsapp` podem ser strings vazias
2. **Formatação**: A formatação (CNPJ, telefone, CEP) deve ser feita antes de passar para o schema
3. **Validação em Tempo Real**: Use `mode: 'onChange'` para validação enquanto o usuário digita
4. **Mensagens de Erro**: Todas as mensagens estão em português e são personalizadas

