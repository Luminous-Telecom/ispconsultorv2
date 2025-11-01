# Componentes UI Base

Este diretório contém os componentes fundamentais e reutilizáveis que formam a base da interface do usuário do sistema BackNet.

## 📦 Componentes Disponíveis

### Button
Botão base com múltiplas variantes, tamanhos e funcionalidades.

```tsx
import { Button } from './components/ui';

<Button variant="primary" size="md" icon="save">
  Salvar
</Button>
```

**Props principais:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'outline-*'
- `size`: 'sm' | 'md' | 'lg'
- `icon`: string (nome do ícone Bootstrap Icons)
- `loading`: boolean
- `disabled`: boolean

### Input
Campo de entrada base com validação e ícones.

```tsx
import { Input } from './components/ui';

<Input
  type="text"
  placeholder="Digite seu nome"
  icon="person"
  iconPosition="left"
  isValid={true}
  validationMessage="Campo válido"
/>
```

**Props principais:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | etc.
- `size`: 'sm' | 'md' | 'lg'
- `icon`: string (nome do ícone)
- `iconPosition`: 'left' | 'right'
- `isValid` / `isInvalid`: boolean
- `validationMessage`: string

### Select
Campo de seleção com busca e agrupamento.

```tsx
import { Select } from './components/ui';

<Select
  options={[
    { value: '1', label: 'Opção 1' },
    { value: '2', label: 'Opção 2', group: 'Grupo A' }
  ]}
  placeholder="Selecione uma opção"
  searchable
  clearable
/>
```

**Props principais:**
- `options`: Array<SelectOption>
- `multiple`: boolean
- `searchable`: boolean
- `clearable`: boolean
- `loading`: boolean
- `emptyText`: string

### Checkbox
Caixa de seleção com suporte a switch e descrições.

```tsx
import { Checkbox } from './components/ui';

<Checkbox
  label="Aceito os termos"
  description="Marque se concorda com os termos de uso"
  switch
  required
/>
```

**Props principais:**
- `label`: string
- `description`: string
- `switch`: boolean (estilo switch)
- `inline`: boolean
- `indeterminate`: boolean

### FormField
Wrapper que combina label + campo + validação.

```tsx
import { FormField } from './components/ui';

<FormField
  type="text"
  label="Nome"
  name="nome"
  value={value}
  onChange={handleChange}
  required
  error={errors.nome}
  tooltip="Nome completo"
/>
```

**Props principais:**
- `type`: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea'
- `label`: string
- `name`: string
- `value`: any
- `onChange`: (value: any, name: string) => void
- `required`: boolean
- `error`: string
- `tooltip`: string

## 🎨 Estilos

Os componentes utilizam Bootstrap 5 como base e incluem estilos customizados em `ui.css`:

- **Validação**: Estados visual, invalid e pending
- **Ícones**: Suporte a Bootstrap Icons
- **Tooltips**: Tooltips nativos do Bootstrap
- **Responsividade**: Adaptação para mobile
- **Acessibilidade**: Suporte a screen readers

## 🔧 Tipos TypeScript

Todos os componentes são totalmente tipados com TypeScript:

```tsx
import { ButtonVariant, InputType, SelectOption } from './components/ui/types';
```

## 📝 Exemplo de Uso Completo

```tsx
import React, { useState } from 'react';
import { FormField, Button } from './components/ui';

const MeuFormulario = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    tipo: '',
    ativo: false,
  });

  const handleChange = (value: any, name: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form>
      <FormField
        type="text"
        label="Nome"
        name="nome"
        value={formData.nome}
        onChange={handleChange}
        required
        tooltip="Nome completo"
      />
      
      <FormField
        type="email"
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      
      <FormField
        type="select"
        label="Tipo"
        name="tipo"
        value={formData.tipo}
        onChange={handleChange}
        options={[
          { value: 'cliente', label: 'Cliente' },
          { value: 'fornecedor', label: 'Fornecedor' }
        ]}
        required
      />
      
      <FormField
        type="checkbox"
        label="Ativo"
        name="ativo"
        value={formData.ativo}
        onChange={handleChange}
        switch
      />
      
      <Button type="submit" variant="primary" icon="save">
        Salvar
      </Button>
    </form>
  );
};
```

## 🚀 Próximos Passos

1. **Testar integração** com componentes existentes
2. **Migrar modais** para usar os novos componentes
3. **Criar sistema de formulários** unificado
4. **Implementar sistema de tabelas** unificado

## 📋 Checklist da Etapa 1

- [x] Criar estrutura de pastas para componentes UI
- [x] Implementar Button.tsx base
- [x] Implementar Input.tsx base
- [x] Implementar Select.tsx base
- [x] Implementar Checkbox.tsx base
- [x] Implementar FormField.tsx wrapper
- [x] Criar tipos TypeScript para componentes UI
- [x] Criar estilos CSS para componentes UI
- [x] Criar exemplo de uso dos componentes
- [ ] Testar integração dos componentes
- [ ] Documentar componentes
- [ ] Fazer commit da etapa
