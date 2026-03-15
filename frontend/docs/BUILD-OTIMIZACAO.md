# Por que o build do frontend está pesado

Documento de análise e recomendações para reduzir o tempo e o tamanho do build do frontend (CRA + CRACO).

---

## 1. Principais causas

### 1.1 TinyMCE (editor rich text)

- **Onde:** `src/components/common/RichTextEditor.tsx`
- **Problema:** O editor é importado de forma síncrona junto com tema, ícones, modelo DOM e vários plugins (advlist, anchor, autolink, charmap, code, fullscreen, image, insertdatetime, link, lists, media, searchreplace, table, visualblocks, wordcount). Isso coloca vários MB no bundle principal.
- **Impacto:** Um dos maiores pacotes do projeto; aumenta tempo de compilação e tamanho do chunk.

**Recomendações (não aplicadas):**
- Carregar TinyMCE via CDN e usar `tinymce-react` apenas como wrapper, ou
- Lazy load do componente: `React.lazy(() => import('./RichTextEditor'))` e usar `<Suspense>` na rota/página que exibe o editor, para que TinyMCE fique em um chunk separado e só seja baixado quando necessário.

---

### 1.2 D3

- **Onde:** Vários componentes em `src/components/charts/` (BarChart, DonutChart, DualLineChart, PolarAreaChart, ResponsiveLineChart, ResponsivePieChart).
- **Problema:** Uso de `import * as d3 from 'd3'` em cada arquivo. Isso inclui o pacote **d3** inteiro no bundle (muitos submodules: scale, shape, array, axis, etc.).
- **Impacto:** Aumenta bastante o tamanho do bundle e o trabalho do Webpack.

**Recomendações (não aplicadas):**
- Trocar para imports por submódulo, por exemplo: `import * as d3Scale from 'd3-scale'`, `import * as d3Shape from 'd3-shape'`, `import * as d3Array from 'd3-array'`, etc., usando apenas o que cada chart precisa.
- Ou lazy load das páginas/rotas que renderizam os charts, para que o chunk do d3 seja carregado só quando abrir relatórios/dashboards.

---

### 1.3 pdfjs-dist

- **Onde:** `src/utils/pdfDomains.ts` — `import * as pdfjsLib from 'pdfjs-dist'`.
- **Problema:** Import da lib inteira; o pacote é grande e pesado para processamento de PDF.
- **Impacto:** Aumenta o bundle principal e o tempo de build.

**Recomendações (não aplicadas):**
- Carregar o viewer/worker do PDF só quando for abrir um PDF (dynamic import na tela que usa).
- Ou usar a build “legacy” do pdfjs se for suficiente para o caso de uso, e importar apenas os módulos necessários.

---

### 1.4 Lodash

- **Onde:** `src/utils/helpers.ts` — já usa imports por método (`lodash/debounce`, `lodash/throttle`, `lodash/cloneDeep`).
- **Status:** Uso correto; o tree-shaking do build pode eliminar o que não é usado. Nenhuma alteração necessária para este documento.

---

### 1.5 Bootstrap e Bootstrap Icons

- **Onde:** Provavelmente importados no `index.tsx` ou em um CSS global.
- **Problema:** Se o CSS completo e todos os ícones forem importados, o bundle de CSS e o processamento (Sass, etc.) ficam maiores.
- **Recomendações (não aplicadas):**
- Importar apenas os módulos SCSS do Bootstrap que são usados (grid, utilities, components específicos).
- Para ícones, considerar importar só os SVGs ou classes que realmente são usados, ou um subset do pacote.

---

### 1.6 CodeMirror / @uiw/react-codemirror e @codemirror

- **Onde:** Uso em algum(s) componente(s) do projeto.
- **Problema:** CodeMirror e temas/linguagens são pesados; se tudo for importado no bundle principal, o build e o bundle crescem.
- **Recomendações (não aplicadas):**
- Lazy load da página ou do componente que usa o editor (ex.: `React.lazy` + `Suspense`), para que CodeMirror fique em chunk separado.

---

### 1.7 Pouco code splitting

- **Problema:** Com Create React App (e CRACO), por padrão a aplicação tende a gerar um ou poucos chunks grandes. Todo o código (TinyMCE, d3, pdfjs, charts, etc.) pode estar no mesmo bundle inicial.
- **Impacto:** Build processa e minifica um bloco muito grande; o primeiro carregamento da aplicação fica pesado.

**Recomendações (não aplicadas):**
- Usar `React.lazy()` nas rotas (por exemplo com `react-router-dom`: `const Page = React.lazy(() => import('./Page'))`) e `<Suspense>` no roteador.
- Assim, páginas pesadas (relatórios com d3, telas com TinyMCE, telas com PDF) viram chunks separados, carregados sob demanda, e o build pode distribuir melhor o trabalho entre chunks.

---

### 1.8 Source maps em produção

- **Problema:** Se `GENERATE_SOURCEMAP=true` (padrão do CRA em produção), o build gera source maps e pode ficar mais lento e o output maior.
- **Recomendação (não aplicada):** Para produção, usar `GENERATE_SOURCEMAP=false` no build (variável de ambiente ou no script: `GENERATE_SOURCEMAP=false npm run build`) para acelerar o build e reduzir tamanho da pasta de build.

---

## 2. Resumo das ações sugeridas

| Prioridade | Ação |
|------------|------|
| Alta | Lazy load do componente que usa TinyMCE (chunk separado). |
| Alta | Trocar `import * as d3` por imports por submódulo do d3 nos charts. |
| Alta | Lazy load das rotas/páginas (code splitting) para relatórios e telas com editor/PDF. |
| Média | Carregar pdfjs-dist só quando for usar PDF (dynamic import). |
| Média | Desativar source maps em produção (`GENERATE_SOURCEMAP=false`). |
| Baixa | Revisar imports de Bootstrap/Bootstrap Icons (só o necessário). |
| Baixa | Lazy load do componente que usa CodeMirror. |

---

## 3. Como medir o impacto

- Para analisar o tamanho do bundle, é possível usar ferramentas como `source-map-explorer` (instalar e rodar após o build) ou `webpack-bundle-analyzer` integrado em um customizado do react-scripts, se necessário no futuro.

---

---

## 4. Correções aplicadas (implementação)

As seguintes otimizações foram implementadas no código:

- **TinyMCE:** Componente `RichTextEditor` passou a ser carregado via lazy load (`RichTextEditorLazy.tsx`) com `<Suspense>` nas abas que usam o editor (MensagensTab, ReciboTab, PermanenciaTab, ConteudoTab, AdesaoTab, ContratoTab, CartaTab).
- **pdfjs-dist:** Uso de dynamic import em `pdfDomains.ts`; a lib só é carregada quando `extractTextFromPdf` ou `extractDomainsFromPdfBuffer` é chamado.
- **Source maps:** Build de produção com `GENERATE_SOURCEMAP=false` no script `build` do `package.json`.
- **D3:** Imports por submódulo nos 6 charts: `d3-selection`, `d3-scale`, `d3-axis`, `d3-shape`, `d3-ease`, `d3-interpolate` em BarChart, DonutChart, DualLineChart, PolarAreaChart, ResponsiveLineChart, ResponsivePieChart (em vez de `import * as d3 from 'd3'`).
- **Craco removido:** Scripts passaram a usar apenas `react-scripts` (start, dev, build, test). O alias `@` continua via `tsconfig.json`. O arquivo `craco.config.js` e as dependências `@craco/craco` e `webpack-bundle-analyzer` foram removidos.

*Documento atualizado após aplicação das correções.*
