import { useCallback } from 'react';
import { useModal } from 'contexts/ModalContext';
import { ChartDataItem } from 'components/charts/types';
import { ModalType } from 'contexts/ModalContext';

export const useDashboardChartClicks = () => {
  const { openModal } = useModal();

  const handleClienteSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue;
    if (fv === undefined) return;
    openModal('clientes' as ModalType, {
      initialFilters: { ativo: Boolean(fv) }
    });
  }, [openModal]);

  const handlePlanoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue;
    if (fv === undefined) return;
    openModal('planos' as ModalType, {
      initialFilters: typeof fv === 'string' ? { status: fv } : { tipo_servico: String(fv) }
    });
  }, [openModal]);

  const handleStatusPagamentoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue as string | undefined;
    if (!fv) return;
    // Calcular primeiro e último dia do mês atual para coincidir com o filtro do gráfico
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    openModal('contas-receber' as ModalType, {
      initialFilters: {
        status: fv,
        data_vencimento_inicio: toISO(inicioMes),
        data_vencimento_fim: toISO(fimMes),
      }
    });
  }, [openModal]);

  const handleDistribuicaoPlanoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = (item.filterValue ?? item.label) as string | undefined;
    if (!fv) return;
    openModal('contratos' as ModalType, {
      initialFilters: { tipo_servico: fv }
    });
  }, [openModal]);

  const handleContratoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue as string | undefined;
    if (!fv) return;
    if (fv === 'isento') {
      openModal('contratos' as ModalType, {
        initialFilters: { isento_mensalidade: true }
      });
    } else if (fv === 'em_atraso') {
      openModal('contratos' as ModalType, {
        initialFilters: { em_atraso: true }
      });
    } else {
      openModal('contratos' as ModalType, {
        initialFilters: { status: fv }
      });
    }
  }, [openModal]);

  const handleClientesPorPlanoBarClick = useCallback((item: ChartDataItem) => {
    const planoId = item.plano_id as number | undefined;
    if (!planoId) return;
    openModal('contratos' as ModalType, {
      initialFilters: { plano_id: planoId }
    });
  }, [openModal]);

  const handleLineChartPointClick = useCallback((
    item: ChartDataItem & { data_inicio?: string; data_fim?: string },
    modalType: 'contas-receber' | 'contas-pagar' | 'clientes',
    statusFilter?: string
  ) => {
    const dataInicio = item.data_inicio;
    const dataFim = item.data_fim;
    if (!dataInicio || !dataFim) return;
    if (modalType === 'contas-receber') {
      openModal('contas-receber' as ModalType, {
        initialFilters: {
          data_vencimento_inicio: dataInicio,
          data_vencimento_fim: dataFim,
          ...(statusFilter && { status: statusFilter })
        }
      });
    } else if (modalType === 'contas-pagar') {
      openModal('contas-pagar' as ModalType, {
        initialFilters: { data_inicio: dataInicio, data_fim: dataFim }
      });
    } else if (modalType === 'clientes') {
      openModal('clientes' as ModalType, {
        initialFilters: { created_at_inicio: dataInicio, created_at_fim: dataFim }
      });
    }
  }, [openModal]);

  const handleRecebidosPeriodoPointClick = useCallback((
    item: ChartDataItem & { data_inicio?: string; data_fim?: string }
  ) => {
    const dataInicio = item.data_inicio;
    const dataFim = item.data_fim;
    if (!dataInicio || !dataFim) return;
    // Gráfico Recebidos é por data de pagamento: abrir modal filtrando por data_pagamento
    openModal('contas-receber' as ModalType, {
      initialFilters: {
        data_pagamento_inicio: dataInicio,
        data_pagamento_fim: dataFim
      }
    });
  }, [openModal]);

  const handleReceberPeriodoPointClick = useCallback((item: ChartDataItem) => {
    // Gráfico "A receber" mostra apenas pendentes e vencidos (não pagos)
    handleLineChartPointClick(item, 'contas-receber', 'pendente,vencido');
  }, [handleLineChartPointClick]);

  const handleReceitaMensalPointClick = useCallback((item: ChartDataItem) => {
    handleLineChartPointClick(item, 'contas-receber');
  }, [handleLineChartPointClick]);

  const handleCrescimentoClientesPointClick = useCallback((item: ChartDataItem) => {
    handleLineChartPointClick(item, 'clientes');
  }, [handleLineChartPointClick]);

  const handleDualLineChartPointClick = useCallback((
    item: ChartDataItem & { data_inicio?: string; data_fim?: string },
    _index: number,
    lineType: 'receber' | 'pagar'
  ) => {
    const dataInicio = item.data_inicio;
    const dataFim = item.data_fim;
    if (!dataInicio || !dataFim) return;
    if (lineType === 'receber') {
      openModal('contas-receber' as ModalType, {
        initialFilters: { data_vencimento_inicio: dataInicio, data_vencimento_fim: dataFim }
      });
    } else {
      openModal('contas-pagar' as ModalType, {
        initialFilters: { data_inicio: dataInicio, data_fim: dataFim }
      });
    }
  }, [openModal]);

  return {
    handleClienteSliceClick,
    handlePlanoSliceClick,
    handleStatusPagamentoSliceClick,
    handleDistribuicaoPlanoSliceClick,
    handleContratoSliceClick,
    handleClientesPorPlanoBarClick,
    handleRecebidosPeriodoPointClick,
    handleReceberPeriodoPointClick,
    handleReceitaMensalPointClick,
    handleCrescimentoClientesPointClick,
    handleDualLineChartPointClick,
  };
};
