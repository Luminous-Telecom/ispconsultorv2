import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import TituloModalBody from './TituloModalBody';
import type { Titulo } from 'types';

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const labels = {
  validationErrors: 'Erros',
  client: 'Cliente',
  plan: 'Plano',
  value: 'Valor',
  dueDate: 'Vencimento',
  description: 'Descrição',
  observations: 'Observações',
  clientCannotBeChanged: 'Cliente fixo',
  planoCannotBeChanged: 'Plano fixo',
  valorCannotBeChanged: 'Valor fixo',
  dataVencimentoCannotBeChanged: 'Vencimento fixo',
  descriptionPlaceholder: 'Desc...',
  observationsPlaceholder: 'Obs...',
  discountPercent: 'Desconto (%)',
  discountValue: 'Desconto (R$)',
  additionPercent: 'Acréscimo (%)',
  additionValue: 'Acréscimo (R$)',
  clientNotFound: 'Não encontrado',
  loading: 'Carregando',
  titleNumber: 'Número',
  chargeId: 'ID da Cobrança',
  ourNumber: 'Nosso Número',
  contract: 'Contrato',
  status: 'Status',
  paidValue: 'Valor baixado',
  openValue: 'Valor aberto',
  paymentDate: 'Data de Pagamento',
  bank: 'Banco',
  barcode: 'Código de Barras',
  barcodeLine: 'Linha Digitável',
  boletoUrl: 'URL do Boleto',
  statusActive: 'Ativo',
  statusInactive: 'Inativo',
  statusSuspended: 'Suspenso',
  statusPending: 'Pendente',
  statusPaid: 'Pago',
  statusOverdue: 'Vencido',
  statusCancelled: 'Cancelada',
  statusPartial: 'Parcial',
  statusPaidLate: 'Pago em Atraso',
};

const tituloBase: Titulo = {
  id: 7,
  cliente_id: 1,
  plano_id: 2,
  banco_id: 3,
  numero_titulo: 'TIT-1',
  valor: 100,
  data_vencimento: '2026-11-01',
  status: 'pendente',
  pago: false,
  created_at: '2026-10-01',
  descricao: 'Mensalidade',
  desconto_percentual: 5,
  charge_id: 'ch_1',
  nosso_numero: '123',
  codigo_barras: '789',
  linha_digitavel: '00190',
  url_boleto: 'https://boleto.example',
  valor_pago: 0,
  valor_aberto: 100,
  banco: { id: 3, nome: 'EFI' } as Titulo['banco'],
};

function renderEditBody(overrides: Partial<React.ComponentProps<typeof TituloModalBody>> = {}) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <TituloModalBody
        isMobile={false}
        isEditMode
        isAvulso={false}
        isPending={false}
        errors={{}}
        formData={{
          plano_id: 2,
          data_vencimento: '2026-11-01',
          valor: 100,
          descricao: 'Mensalidade',
          observacoes: '',
          desconto_percentual: 5,
          desconto_valor: 0,
          acrescimo_percentual: 0,
          acrescimo_valor: 0,
        }}
        tituloRegistradoNoBanco={false}
        valorTitulo={100}
        tituloData={{ success: true, data: tituloBase }}
        onSubmit={jest.fn()}
        onInputChange={jest.fn()}
        onShowPlanoModal={jest.fn()}
        labels={labels}
        {...overrides}
      />
    </I18nProvider>
  );
}

it('mostra descrição e descontos na edição', () => {
  renderEditBody();
  expect((screen.getByLabelText('Descrição') as HTMLInputElement).value).toBe('Mensalidade');
  expect((screen.getByLabelText('Desconto (%)') as HTMLInputElement).value).toBe('5');
  expect(screen.getByLabelText('Acréscimo (R$)')).toBeTruthy();
});

it('mostra campos somente leitura do boleto na edição', () => {
  renderEditBody();
  expect((screen.getByLabelText('ID da Cobrança') as HTMLInputElement).value).toBe('ch_1');
  expect((screen.getByLabelText('Código de Barras') as HTMLInputElement).value).toBe('789');
  expect((screen.getByLabelText('Linha Digitável') as HTMLInputElement).value).toBe('00190');
  expect((screen.getByLabelText('URL do Boleto') as HTMLInputElement).value).toBe('https://boleto.example');
  expect((screen.getByLabelText('Status') as HTMLInputElement).value).toBe('Pendente');
});

it('bloqueia descontos quando título está registrado no banco', () => {
  renderEditBody({ tituloRegistradoNoBanco: true });
  expect((screen.getByLabelText('Desconto (%)') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText('Descrição') as HTMLInputElement).disabled).toBe(false);
});

it('marca campos somente leitura como disabled', () => {
  renderEditBody();
  expect((screen.getByLabelText('Status') as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText('ID da Cobrança') as HTMLInputElement).readOnly).toBe(true);
  expect((screen.getByLabelText('Descrição') as HTMLInputElement).disabled).toBe(false);
});
