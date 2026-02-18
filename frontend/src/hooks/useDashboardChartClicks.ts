import { useCallback } from 'react';
import { useModal } from '@/contexts/ModalContext';
import { ChartDataItem } from '@/components/charts/types';
import { ModalType } from '@/contexts/ModalContext';

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
    openModal('contas-receber' as ModalType, {
      initialFilters: { status: fv }
    });
  }, [openModal]);

  const handleDistribuicaoPlanoSliceClick = useCallback((item: ChartDataItem) => {
    const fv = (item.filterValue ?? item.label) as string | undefined;
    if (!fv) return;
    openModal('planos' as ModalType, {
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

  return {
    handleClienteSliceClick,
    handlePlanoSliceClick,
    handleStatusPagamentoSliceClick,
    handleDistribuicaoPlanoSliceClick,
    handleContratoSliceClick,
    handleClientesPorPlanoBarClick,
  };
};
