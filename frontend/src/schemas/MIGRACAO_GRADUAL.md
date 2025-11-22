# Guia de Migração Gradual para Zod + React Hook Form

## 📋 Estratégia de Migração

A migração foi projetada para ser **gradual** e **não quebrar código existente**. Você pode migrar componente por componente.

## 🔄 Estado Atual

### ✅ **MIGRAÇÃO COMPLETA** - Todas as entidades refatoradas!

#### Schemas Criados
- ✅ `brazilian-documents.schema.ts` - Validações reutilizáveis
- ✅ `cliente.schema.ts` - Schema completo para Cliente
- ✅ `plano.schema.ts` - Schema completo para Plano
- ✅ `contrato.schema.ts` - Schema completo para Contrato
- ✅ `titulo.schema.ts` - Schema completo para Título
- ✅ `banco.schema.ts` - Schema completo para Banco
- ✅ `receber.schema.ts` - Schema completo para ReceberModal

#### Hooks Refatorados
- ✅ `useClienteForm.ts` - Refatorado com React Hook Form + Zod
- ✅ `usePlanoForm.ts` - Criado com React Hook Form + Zod
- ✅ `useContratoForm.ts` - Criado com React Hook Form + Zod
- ✅ `useTituloForm.ts` - Criado com React Hook Form + Zod
- ✅ `useBancoForm.ts` - Criado com React Hook Form + Zod

#### Componentes Refatorados
- ✅ `ClienteModal.tsx` - Usa `useClienteForm`
- ✅ `PlanoModal.tsx` - Usa `usePlanoForm`
- ✅ `ContratoModal.tsx` - Usa `useContratoForm`
- ✅ `TituloModal.tsx` - Usa `useTituloForm`
- ✅ `BancoModal.tsx` - Usa `useBancoForm`
- ✅ `ReceberModal.tsx` - Usa React Hook Form diretamente

### ✅ Status: **100% COMPLETO**
Todas as entidades foram migradas e estão em produção!

## 🚀 Como Migrar um Componente

### Opção 1: Migração Completa (Recomendado)

**Passo 1:** Refatorar o hook para usar React Hook Form

```typescript
// Antes (useClienteForm.ts)
const [formData, setFormData] = useState<ClienteFormData>(initialFormData);
const [errors, setErrors] = useState<ClienteFormErrors>({});

const handleInputChange = (field: keyof ClienteFormData, value: FormValue) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

const validateForm = (): boolean => {
  const validationErrors = validateClienteForm(formData);
  setErrors(validationErrors);
  return Object.keys(validationErrors).length === 0;
};

// Depois (useClienteForm.ts)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '../schemas/cliente.schema';

const {
  register,
  handleSubmit: rhfHandleSubmit,
  formState: { errors },
  watch,
  setValue,
  reset
} = useForm<ClienteFormData>({
  resolver: zodResolver(clienteSchema),
  defaultValues: initialFormData,
  mode: 'onChange'
});

const onSubmit = (data: ClienteFormData) => {
  // data já está validado
  // fazer submit...
};
```

**Passo 2:** Atualizar componentes para usar `register()` e `formState.errors`

```typescript
// Antes
<FormField
  name="cnpj"
  value={formData.cnpj}
  onChange={(value) => handleInputChange('cnpj', value)}
  error={errors.cnpj}
/>

// Depois
<FormField
  name="cnpj"
  value={watch('cnpj')}
  onChange={(value) => setValue('cnpj', value, { shouldValidate: true })}
  error={errors.cnpj?.message}
/>
<input type="hidden" {...register('cnpj')} />
```

### Opção 2: Migração Parcial (Compatibilidade)

Se você quiser manter o código existente funcionando enquanto migra gradualmente:

1. O código atual já funciona porque `validateClienteForm()` usa Zod internamente
2. Você pode migrar componente por componente
3. Não precisa migrar tudo de uma vez

## ✅ Checklist de Migração - COMPLETO

### Todas as entidades migradas:

- [x] Instalar dependências
- [x] Criar schemas Zod para todas as entidades
- [x] Refatorar hooks para usar React Hook Form
- [x] Atualizar componentes para usar hooks refatorados
- [x] Testar validação em tempo real
- [x] Testar submit dos formulários
- [x] Remover código antigo de validação manual

## 🎯 Exemplos de Implementação Completa

### 1. Hooks Refatorados (em produção)

- `hooks/useClienteForm.ts` - Hook completo usando React Hook Form + Zod
- `hooks/usePlanoForm.ts` - Hook completo usando React Hook Form + Zod
- `hooks/useContratoForm.ts` - Hook completo usando React Hook Form + Zod
- `hooks/useTituloForm.ts` - Hook completo usando React Hook Form + Zod
- `hooks/useBancoForm.ts` - Hook completo usando React Hook Form + Zod

### 2. Componentes Refatorados (em produção)

- `components/modals/clientes/cliente/ClienteModal.tsx` - Usa `useClienteForm`
- `components/modals/planos/PlanoModal.tsx` - Usa `usePlanoForm`
- `components/modals/clientes/contrato/ContratoModal.tsx` - Usa `useContratoForm`
- `components/modals/titulos/titulo/TituloModal.tsx` - Usa `useTituloForm`
- `components/modals/bancos/BancoModal.tsx` - Usa `useBancoForm`
- `components/modals/pagamentos/ReceberModal.tsx` - Usa React Hook Form diretamente

### 3. Benefícios Imediatos

- ✅ Validação em tempo real automática
- ✅ Menos código boilerplate
- ✅ Type safety completo
- ✅ Mensagens de erro consistentes
- ✅ Validação centralizada

## ⚠️ Notas Importantes

1. **Formatação**: A formatação (CNPJ, telefone, CEP) ainda precisa ser feita manualmente antes de passar para o schema
2. **Campos Opcionais**: Campos opcionais podem ser strings vazias (`''`)
3. **Compatibilidade**: O código antigo continua funcionando durante a migração
4. **Testes**: Teste cada componente após migração

## ✅ Migração Verificada e Funcionando

Todas as verificações foram realizadas e estão funcionando:

1. ✅ Validação aparece em tempo real enquanto digita
2. ✅ Mensagens de erro são exibidas corretamente
3. ✅ Submit só funciona se formulário válido
4. ✅ Erros desaparecem quando corrigidos
5. ✅ Consultas automáticas (CNPJ/CEP) continuam funcionando
6. ✅ Preenchimento automático com dados do contrato funciona
7. ✅ Funcionalidades especiais mantidas (teste de conexão, geração de secret)
8. ✅ Validação de datas não futuras funciona
9. ✅ Validação de valores numéricos funciona
10. ✅ Todos os tipos TypeScript corretos

## 📚 Recursos

- [Documentação Zod](https://zod.dev/)
- [Documentação React Hook Form](https://react-hook-form.com/)
- [Exemplos no projeto](./README.md)

