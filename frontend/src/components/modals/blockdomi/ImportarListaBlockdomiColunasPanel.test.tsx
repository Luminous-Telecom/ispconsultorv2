import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import ImportarListaBlockdomiColunasPanel from './ImportarListaBlockdomiColunasPanel';
import ImportarListaBlockdomiContent from './ImportarListaBlockdomiContent';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';

const t = ((key: string) => {
  const labels: Record<string, string> = {
    'blockdomi.pasteListHint': 'Cole domínios ou IPs (um por linha)',
    'blockdomi.inputListLabel': 'Lista de entrada',
    'blockdomi.importIntro': 'Cole a lista',
    'blockdomi.paste': 'Colar',
    'buttons.clear': 'Limpar',
    'blockdomi.analyze': 'Analisar',
    'blockdomi.colunasDetectadas': 'Colunas detectadas no PDF',
    'blockdomi.colunasVerMais': 'Ver mais',
    'blockdomi.colunasVerMenos': 'Ver menos',
    'blockdomi.colunasSelecAll': 'Todas',
    'blockdomi.colunasSelecNone': 'Nenhuma',
    'blockdomi.none': 'Nenhuma',
    'buttons.applySelection': 'Aplicar seleção',
  };
  return labels[key] ?? key;
}) as BlockdomiImportTranslateFn;

it('monta as colunas do PDF num painel próprio, fora da coluna do rótulo', () => {
  localStorage.setItem('app-language', 'pt-BR');
  render(
    <I18nProvider>
      <NotificationProvider>
        <ImportarListaBlockdomiColunasPanel
          t={t}
          colunasDisponiveis={{ 'Especificação de Tráfego': ['cdn-c2.me'] }}
          colunasSeleccionadas={new Set(['Especificação de Tráfego'])}
          onColunaToggle={jest.fn()}
          onSelectAll={jest.fn()}
          onSelectNone={jest.fn()}
          onAplicar={jest.fn()}
        />
      </NotificationProvider>
    </I18nProvider>,
  );

  const titulo = screen.getByText('Colunas detectadas no PDF');
  const painel = titulo.closest('.ilb-colunas-panel');

  expect(painel).not.toBeNull();
  expect(painel?.classList.contains('form-modal-input-col')).toBe(false);
  expect(painel?.querySelector('.ilb-classification-cards')).not.toBeNull();
});

it('abre o restante da coluna em Ver mais e volta ao resumo em Ver menos', () => {
  localStorage.setItem('app-language', 'pt-BR');
  const items = ['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com', 'g.com'];
  render(
    <I18nProvider>
      <NotificationProvider>
        <ImportarListaBlockdomiColunasPanel
          t={t}
          colunasDisponiveis={{ 'Especificação de Tráfego': items }}
          colunasSeleccionadas={new Set(['Especificação de Tráfego'])}
          onColunaToggle={jest.fn()}
          onSelectAll={jest.fn()}
          onSelectNone={jest.fn()}
          onAplicar={jest.fn()}
        />
      </NotificationProvider>
    </I18nProvider>,
  );

  expect(screen.getByText('e.com')).toBeTruthy();
  expect(screen.queryByText('f.com')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Ver mais' }));

  expect(screen.getByText('f.com')).toBeTruthy();
  expect(screen.getByText('g.com')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }));

  expect(screen.queryByText('f.com')).toBeNull();
  expect(screen.getByText('e.com')).toBeTruthy();
});

it('coloca a lista antes das colunas do PDF', () => {
  localStorage.setItem('app-language', 'pt-BR');
  const ref = { current: null };
  const noop = jest.fn();
  render(
    <I18nProvider>
      <NotificationProvider>
        <ImportarListaBlockdomiContent
          t={t}
          versaoAtual="1"
          isGerandoVersao={false}
          onGerarVersao={noop}
          numeroSeiAnatel=""
          onNumeroSeiAnatelChange={noop}
          nomeOficio=""
          onNomeOficioChange={noop}
          dataInicioBloqueio=""
          onDataInicioBloqueioChange={noop}
          dataFimBloqueio=""
          onDataFimBloqueioChange={noop}
          linkOficioAnatel=""
          onLinkOficioAnatelChange={noop}
          linkOficioJustica=""
          onLinkOficioJusticaChange={noop}
          linkPlanilhaDominios=""
          onLinkPlanilhaDominiosChange={noop}
          pdfAnatelInputRef={ref}
          pdfJusticaInputRef={ref}
          pdfFileInputRef={ref}
          pdfOficioAnatel={null}
          pdfOficioJustica={null}
          pdfFile={null}
          hasPdfUrl={false}
          isExtractingSei={false}
          isExtractingPdf={false}
          pdfExtractProgress={null}
          onExtractSeiAnatel={noop}
          onExtractFromPdf={noop}
          onExtractFromPdfUrl={noop}
          onClearPdfAnatel={noop}
          onClearPdfJustica={noop}
          onClearPdfMain={noop}
          onPdfAnatelFileChange={noop}
          onPdfJusticaFileChange={noop}
          onPdfMainFileChange={noop}
          colunasDisponiveis={{ 'Especificação de Tráfego': ['cdn-c2.me'] }}
          colunasSeleccionadas={new Set(['Especificação de Tráfego'])}
          onColunaToggle={noop}
          onColunasSelectAll={noop}
          onColunasSelectNone={noop}
          onColunasAplicar={noop}
          rawText=""
          domainCount={0}
          onRawTextChange={noop}
          onPaste={noop}
          onClear={noop}
          onAnalisar={noop}
          isAnalyzing={false}
          classified={null}
          listaModo="bloqueio"
          onListaModoChange={noop}
          onCadastrar={noop}
          canCadastrar={false}
          isCadastrando={false}
          showFiltrosExtract={false}
          dominiosBruto={[]}
          dominiosFiltrados={[]}
          dominiosValidos={[]}
        />
      </NotificationProvider>
    </I18nProvider>,
  );

  const textarea = screen.getByPlaceholderText('Cole domínios ou IPs (um por linha)');
  const titulo = screen.getByText('Colunas detectadas no PDF');
  const layout = textarea.closest('.ilb-entrada-layout');
  const editor = textarea.closest('.ilb-entrada-editor');

  expect(textarea.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(layout).toBe(titulo.closest('.ilb-entrada-layout'));
  expect(editor).not.toBeNull();
  expect(editor?.parentElement).toBe(layout);
  expect(screen.getByRole('button', { name: 'Analisar' }).closest('.ilb-entrada-editor')).toBe(editor);
  expect(layout?.children).toHaveLength(2);
  expect(layout?.children[1]).toBe(titulo.closest('.ilb-colunas-panel'));
});

it('mantém lista, botões e modo na mesma coluna depois de analisar', () => {
  localStorage.setItem('app-language', 'pt-BR');
  const ref = { current: null };
  const noop = jest.fn();
  render(
    <I18nProvider>
      <NotificationProvider>
        <ImportarListaBlockdomiContent
          t={t}
          versaoAtual="1"
          isGerandoVersao={false}
          onGerarVersao={noop}
          numeroSeiAnatel=""
          onNumeroSeiAnatelChange={noop}
          nomeOficio=""
          onNomeOficioChange={noop}
          dataInicioBloqueio=""
          onDataInicioBloqueioChange={noop}
          dataFimBloqueio=""
          onDataFimBloqueioChange={noop}
          linkOficioAnatel=""
          onLinkOficioAnatelChange={noop}
          linkOficioJustica=""
          onLinkOficioJusticaChange={noop}
          linkPlanilhaDominios=""
          onLinkPlanilhaDominiosChange={noop}
          pdfAnatelInputRef={ref}
          pdfJusticaInputRef={ref}
          pdfFileInputRef={ref}
          pdfOficioAnatel={null}
          pdfOficioJustica={null}
          pdfFile={null}
          hasPdfUrl={false}
          isExtractingSei={false}
          isExtractingPdf={false}
          pdfExtractProgress={null}
          onExtractSeiAnatel={noop}
          onExtractFromPdf={noop}
          onExtractFromPdfUrl={noop}
          onClearPdfAnatel={noop}
          onClearPdfJustica={noop}
          onClearPdfMain={noop}
          onPdfAnatelFileChange={noop}
          onPdfJusticaFileChange={noop}
          onPdfMainFileChange={noop}
          colunasDisponiveis={{
            'Lista civil edito marcin Claudio bosta Togbu/e-faw1t2o0u2': ['cdn-c2.me'],
          }}
          colunasSeleccionadas={new Set(['Lista civil edito marcin Claudio bosta Togbu/e-faw1t2o0u2'])}
          onColunaToggle={noop}
          onColunasSelectAll={noop}
          onColunasSelectNone={noop}
          onColunasAplicar={noop}
          rawText="cdn-c2.me"
          domainCount={1}
          onRawTextChange={noop}
          onPaste={noop}
          onClear={noop}
          onAnalisar={noop}
          isAnalyzing={false}
          classified={{
            dominios: ['cdn-c2.me'],
            ipv4: [],
            ipv6: [],
            invalidos: [],
            duplicados: [],
            jaCadastrados: [],
            seraoCadastrados: ['cdn-c2.me'],
          }}
          listaModo="bloqueio"
          onListaModoChange={noop}
          onCadastrar={noop}
          canCadastrar
          isCadastrando={false}
          showFiltrosExtract={false}
          dominiosBruto={[]}
          dominiosFiltrados={[]}
          dominiosValidos={[]}
        />
      </NotificationProvider>
    </I18nProvider>,
  );

  const textarea = screen.getByPlaceholderText('Cole domínios ou IPs (um por linha)');
  const editor = textarea.closest('.ilb-entrada-editor');
  const layout = textarea.closest('.ilb-entrada-layout');
  const modo = screen.getByRole('checkbox', { name: 'blockdomi.modoListaBloqueio' });

  expect(editor).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Analisar' }).closest('.ilb-entrada-editor')).toBe(editor);
  expect(screen.getByRole('button', { name: 'blockdomi.register' }).closest('.ilb-entrada-editor')).toBe(editor);
  expect(modo.closest('.ilb-entrada-editor')).toBe(editor);
  expect(layout?.children).toHaveLength(2);
  expect(layout?.children[0]).toBe(editor);
  expect(layout?.children[1]?.classList.contains('ilb-colunas-panel')).toBe(true);
});
