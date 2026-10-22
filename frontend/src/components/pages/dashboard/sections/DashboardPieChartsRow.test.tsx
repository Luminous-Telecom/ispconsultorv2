import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ChartDataItem } from 'components/charts/types';
import DashboardPieChartsRow from './DashboardPieChartsRow';

jest.mock('components/dashboard/cards', () => ({
  PieStatusCard: ({
    title,
    data,
    onSliceClick,
    onToggleItem,
  }: {
    title: string;
    data: ChartDataItem[];
    onSliceClick?: (item: ChartDataItem) => void;
    onToggleItem: (index: number) => void;
  }) => (
    <div>
      <span>{title}</span>
      <button type="button" onClick={() => data[0] && onSliceClick?.(data[0])}>
        abrir {title}
      </button>
      <button type="button" onClick={() => onToggleItem(0)}>
        ocultar {title}
      </button>
    </div>
  ),
  AverageTicketCard: () => <div>ticket</div>,
  BackupStatusCard: () => null,
}));

const fatiaTodos: ChartDataItem = {
  label: 'Pagos',
  value: 4,
  filterValue: 'pago,pago_atraso,parcial',
};
const fatiaMes: ChartDataItem = {
  ...fatiaTodos,
  value: 1,
  periodo: 'mesAtual',
};

function renderRow(showFinanceiro: boolean) {
  const handleStatusPagamentoSliceClick = jest.fn();
  const togglePagamento = jest.fn();
  const togglePagamentoMesAtual = jest.fn();

  render(
    <DashboardPieChartsRow
      charts={
        {
          statusPagamentoData: [fatiaTodos],
          statusPagamentoMesAtualData: [fatiaMes],
        } as never
      }
      t={(key) => key}
      metrics={{} as never}
      backupStatus={{} as never}
      hiddenItems={
        {
          hiddenClientes: new Set<number>(),
          hiddenPagamentos: new Set<number>(),
          hiddenPagamentosMesAtual: new Set<number>(),
          hiddenDistribuicao: new Set<number>(),
          hiddenContratos: new Set<number>(),
          hiddenBackupStatus: new Set<string>(),
        } as never
      }
      toggles={
        {
          toggleCliente: jest.fn(),
          togglePagamento,
          togglePagamentoMesAtual,
          toggleDistribuicao: jest.fn(),
          toggleContratos: jest.fn(),
          toggleBackupStatus: jest.fn(),
        } as never
      }
      clicks={
        {
          handleClienteSliceClick: jest.fn(),
          handleStatusPagamentoSliceClick,
          handleDistribuicaoPlanoSliceClick: jest.fn(),
          handleContratoSliceClick: jest.fn(),
        } as never
      }
      ticketMedioCardData={{} as never}
      showFinanceiro={showFinanceiro}
      showOperacional={false}
      showCadastros={false}
    />
  );

  return { handleStatusPagamentoSliceClick, togglePagamento, togglePagamentoMesAtual };
}

describe('DashboardPieChartsRow', () => {
  it('mostra o card do mês atual junto com o de todos os pagamentos', () => {
    renderRow(true);

    expect(screen.getByText('dashboard.paymentStatus')).toBeTruthy();
    expect(screen.getByText('dashboard.paymentStatusCurrentMonth')).toBeTruthy();
  });

  it('sem financeiro os dois cards de pagamento ficam de fora', () => {
    renderRow(false);

    expect(screen.queryByText('dashboard.paymentStatus')).toBeNull();
    expect(screen.queryByText('dashboard.paymentStatusCurrentMonth')).toBeNull();
  });

  it('o clique do mês atual leva o período e a legenda não altera o card de todos', () => {
    const { handleStatusPagamentoSliceClick, togglePagamento, togglePagamentoMesAtual } = renderRow(true);

    fireEvent.click(screen.getByRole('button', { name: 'abrir dashboard.paymentStatusCurrentMonth' }));
    expect(handleStatusPagamentoSliceClick).toHaveBeenCalledWith(
      expect.objectContaining({ periodo: 'mesAtual', filterValue: 'pago,pago_atraso,parcial' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'abrir dashboard.paymentStatus' }));
    expect(handleStatusPagamentoSliceClick).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ periodo: 'mesAtual' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'ocultar dashboard.paymentStatusCurrentMonth' }));
    expect(togglePagamentoMesAtual).toHaveBeenCalledWith(0);
    expect(togglePagamento).not.toHaveBeenCalled();
  });
});
