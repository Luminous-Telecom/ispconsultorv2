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

### 3. Refatoração Completa ✅

#### `frontend/src/hooks/useClienteForm.ts` ✅
Hook refatorado para usar:
- React Hook Form para gerenciamento de estado
- Zod para validação centralizada
- zodResolver para integração
- Mantém compatibilidade com código existente

#### Componentes de Aba Atualizados ✅
- `DadosBasicosTab.tsx` - Exibe erros de validação
- `ContatoTab.tsx` - Passa erros para componentes filhos
- `EnderecoTab.tsx` - Passa erros para componentes filhos
- `ObservacoesTab.tsx` - Exibe erros de validação

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

## ✅ Status da Implementação

### 1. Cliente - COMPLETO ✅
- ✅ `useClienteForm.ts` refatorado com React Hook Form + Zod
- ✅ Todos os componentes de aba atualizados para exibir erros
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada

### 2. Plano - COMPLETO ✅
- ✅ `usePlanoForm.ts` criado e refatorado com React Hook Form + Zod
- ✅ `PlanoModal.tsx` refatorado para usar o novo hook
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada
- ✅ Todos os componentes de aba funcionando corretamente

### 3. Contrato - COMPLETO ✅
- ✅ `useContratoForm.ts` criado e refatorado com React Hook Form + Zod
- ✅ `ContratoModal.tsx` refatorado para usar o novo hook
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada
- ✅ Gerencia criação e atualização de contrato
- ✅ Mantém compatibilidade com termos, títulos e serviços adicionais

### 4. Título - COMPLETO ✅
- ✅ `useTituloForm.ts` criado e refatorado com React Hook Form + Zod
- ✅ `TituloModal.tsx` refatorado para usar o novo hook
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada
- ✅ Gerencia criação e atualização de título
- ✅ Mantém preenchimento automático com dados do contrato

### 5. Banco - COMPLETO ✅
- ✅ `banco.schema.ts` criado com validações completas
- ✅ `useBancoForm.ts` criado e refatorado com React Hook Form + Zod
- ✅ `BancoModal.tsx` refatorado para usar o novo hook
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada
- ✅ Mantém funcionalidades especiais (teste de conexão, geração de secret)

### 6. ReceberModal - COMPLETO ✅
- ✅ `receber.schema.ts` criado com validações completas
- ✅ `ReceberModal.tsx` refatorado para usar React Hook Form + Zod diretamente
- ✅ Schema completo e funcional
- ✅ Validação em tempo real implementada
- ✅ Validação de data não futura e valor maior que zero

**Status:** 
- ✅ **TODAS AS ENTIDADES REFATORADAS** - Cliente, Plano, Contrato, Título, Banco e ReceberModal

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

## ✅ Checklist de Implementação

### Cliente - COMPLETO ✅
- [x] Instalar dependências (zod, @hookform/resolvers, react-hook-form)
- [x] Criar schemas reutilizáveis para documentos brasileiros
- [x] Criar schema completo para Cliente
- [x] Refatorar `useClienteForm.ts` para usar React Hook Form + Zod
- [x] Atualizar `DadosBasicosTab.tsx` para exibir erros
- [x] Atualizar `ContatoTab.tsx` para passar erros
- [x] Atualizar `EnderecoTab.tsx` para passar erros
- [x] Atualizar `ObservacoesTab.tsx` para exibir erros
- [x] Adicionar `observacoes` ao tipo `ClienteFormErrors`
- [x] Criar funções helper para compatibilidade
- [x] Documentação completa criada

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA CLIENTE**

### Plano - COMPLETO ✅
- [x] Criar `plano.schema.ts` com validações completas
- [x] Criar `usePlanoForm.ts` com React Hook Form + Zod
- [x] Refatorar `PlanoModal.tsx` para usar o novo hook
- [x] Remover validação manual duplicada
- [x] Implementar validação em tempo real

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA PLANO**

### Contrato - COMPLETO ✅
- [x] Criar `contrato.schema.ts` com validações completas
- [x] Criar `useContratoForm.ts` com React Hook Form + Zod
- [x] Refatorar `ContratoModal.tsx` para usar o novo hook
- [x] Remover validação manual duplicada
- [x] Implementar validação em tempo real
- [x] Gerenciar criação e atualização de contrato

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA CONTRATO**

### Título - COMPLETO ✅
- [x] Criar `titulo.schema.ts` com validações completas
- [x] Criar `useTituloForm.ts` com React Hook Form + Zod
- [x] Refatorar `TituloModal.tsx` para usar o novo hook
- [x] Remover validação manual duplicada
- [x] Implementar validação em tempo real
- [x] Gerenciar criação e atualização de título
- [x] Manter preenchimento automático com dados do contrato

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA TÍTULO**

### Banco - COMPLETO ✅
- [x] Criar `banco.schema.ts` com validações completas
- [x] Criar `useBancoForm.ts` com React Hook Form + Zod
- [x] Refatorar `BancoModal.tsx` para usar o novo hook
- [x] Remover validação manual duplicada
- [x] Implementar validação em tempo real
- [x] Manter funcionalidades especiais (teste de conexão, geração de secret)

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA BANCO**

### ReceberModal - COMPLETO ✅
- [x] Criar `receber.schema.ts` com validações completas
- [x] Refatorar `ReceberModal.tsx` para usar React Hook Form + Zod diretamente
- [x] Remover validação manual duplicada
- [x] Implementar validação em tempo real
- [x] Validação de data não futura e valor maior que zero

**Status:** ✅ **IMPLEMENTAÇÃO COMPLETA PARA RECEBERMODAL**

**Status Geral:** ✅ **TODAS AS ENTIDADES REFATORADAS** - Cliente, Plano, Contrato, Título, Banco e ReceberModal

## ✅ Implementação Completa

Todas as entidades principais e secundárias foram refatoradas:

1. ✅ **Cliente** - Hook `useClienteForm.ts` + Schema `cliente.schema.ts`
2. ✅ **Plano** - Hook `usePlanoForm.ts` + Schema `plano.schema.ts`
3. ✅ **Contrato** - Hook `useContratoForm.ts` + Schema `contrato.schema.ts`
4. ✅ **Título** - Hook `useTituloForm.ts` + Schema `titulo.schema.ts`
5. ✅ **Banco** - Hook `useBancoForm.ts` + Schema `banco.schema.ts`
6. ✅ **ReceberModal** - React Hook Form direto + Schema `receber.schema.ts`

**Padrão estabelecido:** Use `cliente.schema.ts` e `useClienteForm.ts` como referência para novas entidades.

