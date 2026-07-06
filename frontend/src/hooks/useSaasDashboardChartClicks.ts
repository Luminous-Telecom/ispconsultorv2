import { useCallback } from 'react';
import { useModal } from 'contexts/ModalContext';
import { ChartDataItem } from 'components/charts/types';
import { ModalType } from 'contexts/ModalContext';
import { buildDashboardPaymentStatusSliceFilters } from 'utils/dashboardPaymentStatus';

export const useSaasDashboardChartClicks = () => {
  const { openModal } = useModal();

  const handleClienteSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue;
    if (fv === undefined) return;
    openModal('saas-clientes' as ModalType, {
      initialFilters: { ativo: Boolean(fv) }
    });
  }, [openModal]);

  const handleStatusPagamentoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue as string | undefined;
    if (!fv) return;
    openModal('saas-titulos' as ModalType, {
      initialFilters: buildDashboardPaymentStatusSliceFilters(fv),
    });
  }, [openModal]);

  const handleDistribuicaoPlanoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = (item.filterValue ?? item.label) as string | undefined;
    if (!fv) return;
    openModal('saas-clientes' as ModalType, {
      initialFilters: { tipo_servico: fv }
    });
  }, [openModal]);

  const handleContratoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = item.filterValue as string | undefined;
    if (!fv) return;
    openModal('saas-clientes' as ModalType, {
      initialFilters: fv === 'isento' ? { isento_mensalidade: true } : { status: fv }
    });
  }, [openModal]);

  const handleClientesPorPlanoBarClick = useCallback((item: ChartDataItem) => {
    const planoId = item.plano_id as number | undefined;
    if (!planoId) return;
    openModal('saas-clientes' as ModalType, {
      initialFilters: { plano_id: planoId }
    });
  }, [openModal]);

  const handleLineChartPointClick = useCallback((
    item: ChartDataItem & { data_inicio?: string; data_fim?: string },
    modalType: 'contas-receber' | 'clientes',
    statusFilter?: string
  ) => {
    const dataInicio = item.data_inicio;
    const dataFim = item.data_fim;
    if (!dataInicio || !dataFim) return;
    if (modalType === 'contas-receber') {
      openModal('saas-titulos' as ModalType, {
        initialFilters: {
          data_vencimento_inicio: dataInicio,
          data_vencimento_fim: dataFim,
          ...(statusFilter && { status: statusFilter })
        }
      });
    } else if (modalType === 'clientes') {
      openModal('saas-clientes' as ModalType, {
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
    openModal('saas-titulos' as ModalType, {
      initialFilters: {
        data_pagamento_inicio: dataInicio,
        data_pagamento_fim: dataFim,
        status: 'pago,pago_atraso,parcial'
      }
    });
  }, [openModal]);

  const handleReceberPeriodoPointClick = useCallback((item: ChartDataItem) => {
    handleLineChartPointClick(item, 'contas-receber', 'pendente,vencido');
  }, [handleLineChartPointClick]);

  const handleReceitaMensalPointClick = useCallback((item: ChartDataItem) => {
    handleLineChartPointClick(item, 'contas-receber');
  }, [handleLineChartPointClick]);

  const handleCrescimentoClientesPointClick = useCallback((item: ChartDataItem) => {
    handleLineChartPointClick(item, 'clientes');
  }, [handleLineChartPointClick]);

  return {
    handleClienteSliceClick,
    handleStatusPagamentoSliceClick,
    handleDistribuicaoPlanoSliceClick,
    handleContratoSliceClick,
    handleClientesPorPlanoBarClick,
    handleRecebidosPeriodoPointClick,
    handleReceberPeriodoPointClick,
    handleReceitaMensalPointClick,
    handleCrescimentoClientesPointClick,
  };
};
