import React from 'react';
import { render, screen } from '@testing-library/react';
import ClienteModalSubModals from './ClienteModalSubModals';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('components/modals/titulos/titulo', () => ({
  TituloModal: () => <div>titulo-modal</div>,
}));

jest.mock('components/modals/pagamentos/ReceberModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../contrato/ContratoModal', () => ({
  __esModule: true,
  default: () => <div>contrato-modal</div>,
}));

jest.mock('components/common/ImprimirModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/modals/notas-fiscais/GerarNFeModal', () => ({
  __esModule: true,
  default: () => null,
}));

const baseProps = {
  showTituloEditModal: false,
  selectedTituloId: null,
  onCloseTituloEditModal: jest.fn(),
  onTituloEditSuccess: jest.fn(),
  showReceberModal: false,
  selectedParcela: null,
  onCloseReceberModal: jest.fn(),
  onReceberSuccess: jest.fn(),
  showContratoCreateModal: false,
  showContratoEditModal: false,
  selectedContratoId: null,
  onCloseContratoModal: jest.fn(),
  showImprimirModal: false,
  onCloseImprimirModal: jest.fn(),
  pdfUrl: null,
  isGeneratingPdf: false,
  showAuditoriaPreview: false,
  onCloseAuditoriaPreview: jest.fn(),
  auditoriaPdfUrl: null,
  auditoriaIsGenerating: false,
  showGerarNFeModal: false,
  onCloseGerarNFeModal: jest.fn(),
  selectedTituloForNFe: null,
  onGerarNFeSuccess: jest.fn(),
};

describe('ClienteModalSubModals', () => {
  it('não monta o contrato enquanto o modal está fechado', () => {
    render(<ClienteModalSubModals {...baseProps} />);
    expect(screen.queryByText('contrato-modal')).toBeNull();
  });

  it('monta o contrato ao criar a partir do cliente', () => {
    render(<ClienteModalSubModals {...baseProps} showContratoCreateModal />);
    expect(screen.getByText('contrato-modal')).toBeTruthy();
  });
});
