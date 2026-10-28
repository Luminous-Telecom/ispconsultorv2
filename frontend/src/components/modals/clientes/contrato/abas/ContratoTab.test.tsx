import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ContratoTab from './ContratoTab';
import { ContratoForm } from '../types';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('components/notifications/NotificationProvider', () => ({
  useNotificationContext: () => ({
    error: jest.fn(),
    success: jest.fn(),
  }),
}));

jest.mock('hooks/useEntityRecordEdit', () => ({
  useEntityRecordEdit: () => ({
    open: jest.fn(),
    modal: null,
  }),
}));

jest.mock('components/modals/clientes/ClienteListModal', () => ({
  __esModule: true,
  default: ({ show }: { show: boolean }) => (show ? <div>lista-clientes</div> : null),
}));

const formData: ContratoForm = {
  cliente_id: 4,
  plano_id: 0,
  desconto_percentual: 0,
  desconto_valor: 0,
  data_inicio: '2026-01-01',
  data_fim: '',
  status: 'ativo',
  observacoes: '',
  isento_mensalidade: false,
  dia_vencimento_id: 0,
  conta_boleto: 0,
  tipo_cobranca_contrato_id: null,
  data_validade_desconto: '',
  modelo_documento_id: 0,
};

function renderTab(clienteId = 4, razao = 'Provedor Alfa') {
  return render(
    <ContratoTab
      formData={{ ...formData, cliente_id: clienteId }}
      errors={{}}
      handleInputChange={jest.fn()}
      planoSelecionado={null}
      bancoSelecionado={null}
      tipoCobrancaContratoSelecionado={null}
      modeloContratoSelecionado={null}
      onPlanoSelect={jest.fn()}
      onBancoSelect={jest.fn()}
      onTipoCobrancaContratoSelect={jest.fn()}
      onModeloContratoSelect={jest.fn()}
      planosData={[]}
      bancosData={[]}
      tiposCobrancaContratoData={[]}
      modelosContratoData={undefined}
      diasVencimento={[]}
      clienteData={clienteId > 0 ? ({ id: clienteId, razao_social: razao } as never) : null}
      onShowPlanoModal={jest.fn()}
      onShowBancoModal={jest.fn()}
      onShowTipoCobrancaContratoModal={jest.fn()}
      onShowModeloContratoModal={jest.fn()}
    />
  );
}

describe('ContratoTab cliente', () => {
  it('mostra o cliente já vinculado ao abrir pela aba do cadastro', () => {
    renderTab();
    expect(screen.getByDisplayValue('Provedor Alfa')).toBeTruthy();
  });

  it('abre a lista para escolher o cliente', async () => {
    renderTab(0, '');
    expect(screen.queryByDisplayValue('Provedor Alfa')).toBeNull();
    fireEvent.click(screen.getByTitle('ui.selectClient'));
    expect(screen.getByText('lista-clientes')).toBeTruthy();
  });
});
