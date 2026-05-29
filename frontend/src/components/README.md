# Componentes BackNet

Este documento descreve os componentes principais do sistema BackNet.

## 📁 Estrutura de Pastas

```
components/
├── common/          # Componentes compartilhados
├── ui/             # Componentes de interface básica
├── layout/         # Layout e navegação
├── modals/         # Modais e dialog
├── pages/          # Páginas principais
├── tables/         # Componentes de tabela
├── charts/         # Gráficos e visualizações
├── notifications/  # Sistema de notificações
└── forms/          # Componentes de formulário
```

## 🎨 Componentes UI (Interface Básica)

### Button
Componente de botão padronizado com variantes Bootstrap.

```tsx
import Button from '@/components/ui/Button';

<Button variant="primary" size="md" onClick={handleClick}>
  Salvar
</Button>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'`
- `size`: `'sm' | 'md' | 'lg'`
- `disabled`: `boolean`
- `isPending`: `boolean` (mostra spinner)
- `icon`: `string` (nome do ícone Bootstrap)
- `href`: `string` (transforma em link)

### Badge
Componente para exibir status ou etiquetas.

```tsx
import Badge from '@/components/ui/Badge';

<Badge variant="success" pill>Ativo</Badge>
```

**Props:**
- `variant`: `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'`
- `pill`: `boolean` (formato arredondado)
- `clickable`: `boolean` (com cursor pointer)

### Spinner
Componente de loading padronizado.

```tsx
import Spinner from '@/components/ui/Spinner';

<Spinner size="md" variant="primary" aria-label="Carregando..." />
```

**Props:**
- `size`: `'sm' | 'md' | 'lg'`
- `variant`: `'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark'`
- `aria-label`: `string` (acessibilidade)

### Card
Componente de cartão para agrupar conteúdo.

```tsx
import Card from '@/components/ui/Card';

<Card variant="elevated" header={<h5>Título</h5>} footer={<Button>Salvar</Button>}>
  <p>Conteúdo do cartão</p>
</Card>
```

**Props:**
- `variant`: `'default' | 'outline' | 'elevated'`
- `padding`: `'none' | 'sm' | 'md' | 'lg'`
- `header`: `ReactNode`
- `footer`: `ReactNode`
- `hover`: `boolean`
- `clickable`: `boolean`

## 🏗️ Componentes de Layout

### Layout
Layout principal responsivo com sidebar e header.

**Features:**
- Sidebar colapsável
- Header responsivo
- Suporte a temas claro/escuro
- Navegação mobile-first

### Sidebar
Menu lateral de navegação.

**Features:**
- Links de navegação
- Indicadores ativos
- Suporte mobile
- Menu colapsível

### Header
Cabeçalho principal com controles.

**Features:**
- Título dinâmico
- Controles de busca
- Seletor de idioma
- Alternador de tema
- Menu de usuário

## 📊 Componentes de Tabela

### Table
Tabela avançada com funcionalidades completas.

**Features:**
- Ordenação por coluna
- Paginação
- Busca e filtros
- Seleção múltipla
- Ações em lote
- Responsividade mobile
- Exportação

### TableColumn
Coluna configurável da tabela.

**Props:**
- `key`: `string`
- `title`: `string`
- `sortable`: `boolean`
- `width`: `string | number`
- `align`: `'left' | 'center' | 'right'`
- `render`: `function`

## Modais de listagem (`ListModal`)

Listagens em modal devem usar `components/common/ListModal` + `hooks/useEntityListModal`.

Ver inventário e roadmap: [`docs/COMPONENTES-CENTRALIZACAO.md`](../../docs/COMPONENTES-CENTRALIZACAO.md).

## 🔧 Componentes Comuns

### ErrorBoundary
Captura erros JavaScript e mostra UI amigável.

```tsx
import ErrorBoundary from '@/components/common/ErrorBoundary';

<ErrorBoundary fallback={<div>Erro!</div>}>
  <ComponenteQuePodeFalhar />
</ErrorBoundary>
```

### Loading
Componentes de loading consistentes.

```tsx
import Loading from '@/components/common/Loading';

<Loading message="Carregando dados..." />
```

### LanguageSelector
Seletor de idioma para internacionalização.

```tsx
import LanguageSelector from '@/components/common/LanguageSelector';

<LanguageSelector />
```

## 🎯 Hooks Personalizados

### useI18n
Hook para internacionalização.

```tsx
import { useI18n } from '@/contexts/I18nContext';

const { t, language, setLanguage } = useI18n();

return <span>{t('messages.loading')}</span>;
```

### useErrorHandler
Hook para tratamento de erros.

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

const { logError, handleAsyncError } = useErrorHandler();
```

### useNotificationContext
Hook para notificações do sistema.

```tsx
import { useNotificationContext } from '@/components/notifications/NotificationProvider';

const { success, error, warning, info } = useNotificationContext();
```

## 🎨 Sistema de Tema

O sistema suporta temas claro e escuro automaticamente.

### Alternar Tema
```tsx
import { useTheme } from '@/contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();
```

### Variáveis CSS
```scss
// Tema claro
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
}

// Tema escuro
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
}
```

## 🌐 Internacionalização

Suporte a múltiplos idiomas com contexto reativo.

### Idiomas Suportados
- 🇧🇷 Português (pt-BR)
- 🇺🇸 English (en-US)
- 🇪🇸 Español (es-ES)

### Uso Básico
```tsx
import { useI18n } from '@/contexts/I18nContext';

const { t } = useI18n();

return <h1>{t('dashboard.title')}</h1>;
```

## 📱 PWA (Progressive Web App)

O sistema inclui suporte básico a PWA.

### Manifest.json
Configurado com ícones, nome e configurações PWA.

### Service Worker
Cache básico para recursos estáticos e estratégia network-first para API.

### Instalação
O app pode ser instalado como PWA em dispositivos móveis e desktop.

## 🚀 Boas Práticas

### 1. Componentes
- Use TypeScript para tipagem forte
- Mantenha componentes pequenos e focados
- Use hooks para lógica reutilizável
- Implemente acessibilidade (ARIA labels)

### 2. Estilos
- Use classes CSS ao invés de estilos inline
- Siga convenções Bootstrap
- Use variáveis CSS para temas
- Mantenha responsividade

### 3. Estado
- Use Context para estado global
- Use React Query para dados do servidor
- Implemente loading e error states
- Use hooks customizados para lógica

### 4. Performance
- Implemente code splitting
- Use lazy loading para rotas
- Otimize imagens e bundles
- Implemente error boundaries

## 📝 Próximos Passos

- [ ] Implementar testes unitários
- [ ] Criar Storybook para componentes
- [ ] Melhorar documentação de APIs
- [ ] Implementar analytics
- [ ] Adicionar mais idiomas
- [ ] Otimizar performance avançada