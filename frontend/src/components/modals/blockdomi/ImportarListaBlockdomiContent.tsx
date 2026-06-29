import React from 'react';
import { Loading } from 'components/ui';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';
import type { ClassifiedList } from './importarListaBlockdomiTypes';
import ImportarListaBlockdomiVersaoHeader from './ImportarListaBlockdomiVersaoHeader';
import ImportarListaBlockdomiOficioSection from './ImportarListaBlockdomiOficioSection';
import ImportarListaBlockdomiColunasPanel from './ImportarListaBlockdomiColunasPanel';
import ImportarListaBlockdomiEditorSection from './ImportarListaBlockdomiEditorSection';
import ImportarListaBlockdomiFiltrosCards from './ImportarListaBlockdomiFiltrosCards';
import ImportarListaBlockdomiClassificationCards, {
  renderImportarListaBlockdomiList,
} from './ImportarListaBlockdomiClassificationCards';

export interface ImportarListaBlockdomiContentProps {
  t: BlockdomiImportTranslateFn;
  versaoAtual: string;
  isGerandoVersao: boolean;
  onGerarVersao: () => void;
  numeroSeiAnatel: string;
  onNumeroSeiAnatelChange: (value: string) => void;
  nomeOficio: string;
  onNomeOficioChange: (value: string) => void;
  dataInicioBloqueio: string;
  onDataInicioBloqueioChange: (value: string) => void;
  dataFimBloqueio: string;
  onDataFimBloqueioChange: (value: string) => void;
  linkOficioAnatel: string;
  onLinkOficioAnatelChange: (value: string) => void;
  linkOficioJustica: string;
  onLinkOficioJusticaChange: (value: string) => void;
  linkPlanilhaDominios: string;
  onLinkPlanilhaDominiosChange: (value: string) => void;
  pdfAnatelInputRef: React.RefObject<HTMLInputElement | null>;
  pdfJusticaInputRef: React.RefObject<HTMLInputElement | null>;
  pdfFileInputRef: React.RefObject<HTMLInputElement | null>;
  pdfOficioAnatel: File | null;
  pdfOficioJustica: File | null;
  pdfFile: File | null;
  hasPdfUrl: boolean;
  isExtractingSei: boolean;
  isExtractingPdf: boolean;
  pdfExtractProgress: { current: number; total: number } | null;
  onExtractSeiAnatel: () => void;
  onExtractFromPdf: () => void;
  onExtractFromPdfUrl: () => void;
  onClearPdfAnatel: () => void;
  onClearPdfJustica: () => void;
  onClearPdfMain: () => void;
  onPdfAnatelFileChange: (file: File | null) => void;
  onPdfJusticaFileChange: (file: File | null) => void;
  onPdfMainFileChange: (file: File | null) => void;
  colunasDisponiveis: Record<string, string[]> | null;
  colunasSeleccionadas: Set<string>;
  onColunaToggle: (header: string) => void;
  onColunasSelectAll: () => void;
  onColunasSelectNone: () => void;
  onColunasAplicar: () => void;
  rawText: string;
  domainCount: number;
  onRawTextChange: (value: string) => void;
  onPaste: () => void;
  onClear: () => void;
  onAnalisar: () => void;
  isAnalyzing: boolean;
  classified: ClassifiedList | null;
  listaModo: 'bloqueio' | 'desbloqueio';
  onListaModoChange: (modo: 'bloqueio' | 'desbloqueio') => void;
  onCadastrar: () => void;
  canCadastrar: boolean;
  isCadastrando: boolean;
  showFiltrosExtract: boolean;
  dominiosBruto: string[];
  dominiosFiltrados: { raw: string; fixed: string }[];
  dominiosValidos: string[];
  onCopy: (items: string[]) => void;
}

const ImportarListaBlockdomiContent: React.FC<ImportarListaBlockdomiContentProps> = (props) => {
  const {
    t,
    versaoAtual,
    isGerandoVersao,
    onGerarVersao,
    colunasDisponiveis,
    showFiltrosExtract,
    isAnalyzing,
    classified,
    dominiosBruto,
    dominiosFiltrados,
    dominiosValidos,
    onCopy,
  } = props;

  return (
    <div className="p-3 importar-lista-blockdomi">
      <ImportarListaBlockdomiVersaoHeader
        versaoAtual={versaoAtual}
        isGerandoVersao={isGerandoVersao}
        onGerarVersao={onGerarVersao}
        t={t}
      />

      <ImportarListaBlockdomiOficioSection
        t={t}
        numeroSeiAnatel={props.numeroSeiAnatel}
        onNumeroSeiAnatelChange={props.onNumeroSeiAnatelChange}
        nomeOficio={props.nomeOficio}
        onNomeOficioChange={props.onNomeOficioChange}
        dataInicioBloqueio={props.dataInicioBloqueio}
        onDataInicioBloqueioChange={props.onDataInicioBloqueioChange}
        dataFimBloqueio={props.dataFimBloqueio}
        onDataFimBloqueioChange={props.onDataFimBloqueioChange}
        linkOficioAnatel={props.linkOficioAnatel}
        onLinkOficioAnatelChange={props.onLinkOficioAnatelChange}
        linkOficioJustica={props.linkOficioJustica}
        onLinkOficioJusticaChange={props.onLinkOficioJusticaChange}
        linkPlanilhaDominios={props.linkPlanilhaDominios}
        onLinkPlanilhaDominiosChange={props.onLinkPlanilhaDominiosChange}
        pdfAnatelInputRef={props.pdfAnatelInputRef}
        pdfJusticaInputRef={props.pdfJusticaInputRef}
        pdfFileInputRef={props.pdfFileInputRef}
        pdfOficioAnatel={props.pdfOficioAnatel}
        pdfOficioJustica={props.pdfOficioJustica}
        pdfFile={props.pdfFile}
        hasPdfUrl={props.hasPdfUrl}
        isExtractingSei={props.isExtractingSei}
        isExtractingPdf={props.isExtractingPdf}
        pdfExtractProgress={props.pdfExtractProgress}
        onExtractSeiAnatel={props.onExtractSeiAnatel}
        onExtractFromPdf={props.onExtractFromPdf}
        onExtractFromPdfUrl={props.onExtractFromPdfUrl}
        onClearPdfAnatel={props.onClearPdfAnatel}
        onClearPdfJustica={props.onClearPdfJustica}
        onClearPdfMain={props.onClearPdfMain}
        onPdfAnatelFileChange={props.onPdfAnatelFileChange}
        onPdfJusticaFileChange={props.onPdfJusticaFileChange}
        onPdfMainFileChange={props.onPdfMainFileChange}
      />

      {colunasDisponiveis && Object.keys(colunasDisponiveis).length > 0 && (
        <ImportarListaBlockdomiColunasPanel
          colunasDisponiveis={colunasDisponiveis}
          colunasSeleccionadas={props.colunasSeleccionadas}
          onColunaToggle={props.onColunaToggle}
          onSelectAll={props.onColunasSelectAll}
          onSelectNone={props.onColunasSelectNone}
          onAplicar={props.onColunasAplicar}
          t={t}
        />
      )}

      <ImportarListaBlockdomiEditorSection
        t={t}
        rawText={props.rawText}
        domainCount={props.domainCount}
        onRawTextChange={props.onRawTextChange}
        onPaste={props.onPaste}
        onClear={props.onClear}
        onAnalisar={props.onAnalisar}
        isAnalyzing={isAnalyzing}
        classified={classified}
        listaModo={props.listaModo}
        onListaModoChange={props.onListaModoChange}
        onCadastrar={props.onCadastrar}
        canCadastrar={props.canCadastrar}
        isCadastrando={props.isCadastrando}
      />

      {showFiltrosExtract && (
        <ImportarListaBlockdomiFiltrosCards
          t={t}
          dominiosBruto={dominiosBruto}
          dominiosFiltrados={dominiosFiltrados}
          dominiosValidos={dominiosValidos}
          onCopy={onCopy}
          renderList={renderImportarListaBlockdomiList}
        />
      )}

      {isAnalyzing && (
        <div className="ilb-processing mt-1">
          <Loading variant="inline" size="sm" message={t('blockdomi.classifying')} />
        </div>
      )}

      {classified && !isAnalyzing && (
        <ImportarListaBlockdomiClassificationCards t={t} classified={classified} />
      )}
    </div>
  );
};

export default ImportarListaBlockdomiContent;
