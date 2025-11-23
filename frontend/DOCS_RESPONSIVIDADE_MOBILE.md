# Melhorias de Responsividade Mobile - BackNet ERP

Este documento descreve as diretrizes e melhorias sugeridas para tornar a interface do BackNet ERP totalmente responsiva e otimizada para dispositivos móveis.

## 1. Layout e Estrutura Geral

### Grid System (Bootstrap)
O projeto já utiliza Bootstrap. Para mobile, devemos garantir o uso correto dos breakpoints:
- **Mobile (xs/sm):** Elementos devem ocupar 100% da largura (`col-12`).
- **Tablet (md):** Elementos podem dividir a tela (`col-md-6`).
- **Desktop (lg/xl):** Layout padrão (`col-lg-3`, `col-lg-4`, etc.).

**Recomendação:**
Revisar todas as páginas para garantir que `row` e `col-*` estão sendo usados com os breakpoints corretos. Evitar larguras fixas em pixels.

### Navegação (Sidebar/Menu)
- **Mobile:** O menu lateral deve ser ocultável (offcanvas/drawer) e acionado por um botão "hambúrguer" no topo.
- **Comportamento:** Ao clicar em um item do menu no mobile, a sidebar deve fechar automaticamente.

## 2. Componentes Específicos

### Tabelas (`DataTable` / `Table.tsx`)
Tabelas complexas são difíceis de visualizar no mobile.
**Melhoria Atual:** O código já possui `useIsMobile`.
**Sugestão de Implementação:**
- **Card View:** Em telas < 768px, transformar as linhas da tabela em "Cards". O cabeçalho da tabela some, e cada célula vira um par "Label: Valor" dentro de um card.
- **Ações:** Botões de ação (Editar, Excluir) devem ficar visíveis no rodapé do card ou em um menu "três pontos" grande.
- **Scroll Horizontal:** Se o "Card View" não for viável para todos os dados, manter a tabela com `table-responsive` (scroll horizontal), mas fixar a primeira coluna (ID/Nome).

### Dashboard
- **Cards de Estatísticas (Hero):**
  - Devem empilhar verticalmente em mobile (`flex-column` já aplicado, verificar espaçamento `gap-3`).
  - Reduzir o tamanho da fonte dos valores (`dashboard-hero-value`) em telas pequenas para evitar quebra de linha indesejada.
- **Gráficos:**
  - Altura dos gráficos deve ser ajustada. Em mobile, um gráfico de pizza pode ser menor (ex: 300px de altura) para não ocupar a tela toda.
  - Legendas devem ir para baixo do gráfico, não na lateral, para ganhar largura.

### Modais (`DraggableModal`)
- **Full Screen:** Em dispositivos móveis, modais devem ocupar 100% da tela (largura e altura) ou atuar como um "Bottom Sheet" (painel que desliza de baixo).
- **Botão Fechar:** Garantir que o botão "X" ou "Fechar" seja grande e facilmente acessível (zona de toque de 44px).
- **Draggable:** Desabilitar a função "arrastar" em mobile, pois o modal deve ser fixo/full-screen.

### Formulários
- **Inputs:**
  - Altura mínima de 44px para inputs e botões (padrão de toque).
  - `type="tel"`, `type="email"`, `type="number"` para abrir o teclado correto no celular.
- **Selects:** Garantir que os dropdowns não estourem a largura da tela.

## 3. UI/UX e Acessibilidade Mobile

### Tipografia
- Tamanho base da fonte: 16px (evita zoom automático em inputs no iOS).
- Títulos: Ajustar escalas (`h1`, `h2`) para não serem excessivamente grandes em telas pequenas.

### Touch Targets (Zonas de Toque)
- Botões e links devem ter área clicável de pelo menos 44x44 pixels.
- Aumentar padding interno de botões pequenos (`btn-sm`) quando em mobile.

### Feedback Visual
- Loading states (spinners) centralizados e visíveis.
- Toasts/Notificações devem aparecer no topo ou fundo da tela, ocupando a largura total (menos margem), facilitando a leitura.

## 4. Plano de Ação (Checklist)

- [ ] **CSS Global:** Verificar `themes.css` para media queries globais de ajuste de fonte e espaçamento (`p-*, m-*`).
- [ ] **Table.tsx:** Implementar modo "Card View" condicional baseado no hook `useIsMobile`.
- [ ] **Dashboard.tsx:** Ajustar `col` dos cards de estatísticas para `col-12 col-sm-6` para melhor distribuição em telas médias/pequenas.
- [ ] **Modais:** Adicionar classe CSS condicional para modais full-screen em mobile (`modal-fullscreen-sm-down`).
- [ ] **Menu:** Verificar comportamento do Sidebar em mobile.

## Exemplo de CSS Helper (Sugestão)

```css
/* Adicionar em custom.css ou protection.css */

@media (max-width: 767.98px) {
  /* Transformar tabela em cards */
  .table-mobile-cards thead {
    display: none;
  }
  
  .table-mobile-cards tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid #dee2e6;
    border-radius: 0.5rem;
    background: #fff;
  }
  
  .table-mobile-cards td {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid #eee;
  }
  
  .table-mobile-cards td::before {
    content: attr(data-label);
    font-weight: bold;
    margin-right: 1rem;
  }
  
  /* Modal Fullscreen em mobile */
  .modal-dialog {
    margin: 0.5rem;
  }
}
```

