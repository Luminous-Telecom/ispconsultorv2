import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { FecharButton, Loading } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCobrancaAgenda, useCobrancaIndicadores } from 'hooks/useCobrancaPainel';
import CobrancaAgendaPainel from './CobrancaAgendaPainel';
import CobrancaIndicadoresPainel from './CobrancaIndicadoresPainel';
import { dataIso, mesAtual, somarDiasIso } from './cobrancaLabels';

type AbaCobranca = 'indicadores' | 'agenda';

interface CobrancaPainelModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const hoje = dataIso(new Date());

const CobrancaPainelModal: React.FC<CobrancaPainelModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [aba, setAba] = useState<AbaCobranca>('indicadores');
  const [mes, setMes] = useState(mesAtual);
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(somarDiasIso(hoje, 15));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('cliente');
  const [sortColumn, setSortColumn] = useState('data_envio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const indicadores = useCobrancaIndicadores(mes, show && aba === 'indicadores');
  const agenda = useCobrancaAgenda(
    { data_inicio: dataInicio, data_fim: dataFim, page, limit, search, searchField, sortColumn, sortDirection },
    show && aba === 'agenda'
  );

  const tabs = useMemo(
    (): ModalTabItem<AbaCobranca>[] => [
      { id: 'indicadores', label: t('cobranca.tabIndicators') },
      { id: 'agenda', label: t('cobranca.tabAgenda') },
    ],
    [t]
  );

  const headerActionsContent = useMemo(
    () => (
      <div className="entidade-header-unified">
        <div className="entidade-header-buttons modal-header-actions">
          <FecharButton type="button" onClick={onClose} />
        </div>
        <div className="entidade-header-tabs">
          <ModalTabsOverflow
            tabs={tabs}
            activeTab={aba}
            onTabChange={setAba}
            tabsClassName={`banco-tabs-unified ${isMobile ? 'entidade-tabs-mobile' : ''}`}
            isMobile={isMobile}
            id="cobrancaPainelTab"
          />
        </div>
      </div>
    ),
    [aba, isMobile, onClose, tabs]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) onHeaderActionsReady(headerActionsContent);
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const alterarInicio = useCallback((valor: string) => {
    setDataInicio(valor);
    setPage(1);
  }, []);
  const alterarFim = useCallback((valor: string) => {
    setDataFim(valor);
    setPage(1);
  }, []);

  const conteudo = (
    <div className="cobranca-painel-modal-content d-flex flex-column flex-grow-1 min-h-0 h-100">
      {aba === 'indicadores' ? (
        indicadores.isLoading ? (
          <Loading variant="modal" />
        ) : indicadores.data?.data ? (
          <CobrancaIndicadoresPainel mes={mes} onMesChange={setMes} dados={indicadores.data.data} />
        ) : (
          <p className="form-helper-message px-3 pt-3">{t('cobranca.emptyIndicators')}</p>
        )
      ) : (
        <CobrancaAgendaPainel
          dados={agenda.data?.data}
          loading={agenda.isLoading}
          fetching={agenda.isFetching}
          dataInicio={dataInicio}
          dataFim={dataFim}
          search={search}
          searchField={searchField}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onDataInicioChange={alterarInicio}
          onDataFimChange={alterarFim}
          onSearch={(termo, campo) => {
            setSearch(termo);
            setSearchField(campo);
            setPage(1);
          }}
          onSearchFieldChange={setSearchField}
          onSort={(coluna, direcao) => {
            setSortColumn(coluna);
            setSortDirection(direcao);
          }}
          onPageChange={setPage}
          onLimitChange={(novo) => {
            setLimit(novo);
            setPage(1);
          }}
          onRefresh={() => void agenda.refetch()}
        />
      )}
    </div>
  );

  if (skipWrapper) return conteudo;

  return (
    <DraggableModal show={show} onClose={onClose} title={t('modal.billingInsights')} size="xl" modalId="cobranca-painel" headerActions={headerActionsContent}>
      {conteudo}
    </DraggableModal>
  );
};

export default CobrancaPainelModal;
