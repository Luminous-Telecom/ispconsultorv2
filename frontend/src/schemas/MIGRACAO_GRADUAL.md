# Guia de Migração Gradual para Zod + React Hook Form

## 📋 Estratégia de Migração

A migração foi projetada para ser **gradual** e **não quebrar código existente**. Você pode migrar componente por componente.

## 🔄 Estado Atual

### ✅ Implementado
- ✅ Schemas Zod criados (`cliente.schema.ts`)
- ✅ Validações reutilizáveis (`brazilian-documents.schema.ts`)
- ✅ Funções helper para compatibilidade (`cliente.schema-helpers.ts`)
- ✅ Arquivo antigo atualizado para usar Zod por baixo dos panos (`cliente.schemas.ts`)

### ⏳ Código Existente (ainda funciona)
- `useClienteForm.ts` - Usa `validateClienteForm()` que agora usa Zod internamente
- Componentes de formulário - Continuam funcionando normalmente

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

## 📝 Checklist de Migração

### Para cada componente de formulário:

- [ ] Instalar dependências (já feito)
- [ ] Criar/atualizar schema Zod para a entidade
- [ ] Refatorar hook para usar React Hook Form
- [ ] Atualizar componentes para usar `register()` e `formState.errors`
- [ ] Testar validação em tempo real
- [ ] Testar submit do formulário
- [ ] Remover código antigo de validação manual

## 🎯 Exemplo Completo: Migração do Cliente

### 1. Hook Refatorado

Veja: `hooks/useClienteFormWithZod.example.ts`

### 2. Componente Refatorado

Veja: `components/modals/clientes/cliente/abas/DadosBasicosTabWithZod.example.tsx`

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

## 🔍 Verificando se a Migração Funcionou

1. ✅ Validação aparece em tempo real enquanto digita
2. ✅ Mensagens de erro são exibidas corretamente
3. ✅ Submit só funciona se formulário válido
4. ✅ Erros desaparecem quando corrigidos
5. ✅ Consultas automáticas (CNPJ/CEP) continuam funcionando

## 📚 Recursos

- [Documentação Zod](https://zod.dev/)
- [Documentação React Hook Form](https://react-hook-form.com/)
- [Exemplos no projeto](./README.md)

