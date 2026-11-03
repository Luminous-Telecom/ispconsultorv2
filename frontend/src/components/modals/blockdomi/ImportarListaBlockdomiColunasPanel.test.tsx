import React from 'react';
import { render, screen } from '@testing-library/react';
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

  expect(textarea.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(textarea.closest('.ilb-entrada-layout')).toBe(titulo.closest('.ilb-entrada-layout'));
});
