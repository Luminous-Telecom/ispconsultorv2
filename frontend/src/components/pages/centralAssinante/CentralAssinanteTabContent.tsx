import React from 'react';
import { DadosCentralAssinante } from 'services/centralAssinanteService';
import {
  CentralAssinanteCardTipo,
  CentralAssinanteTab,
  FaturaVisualizar,
} from './centralAssinanteUtils';
import ResumoTab from './tabs/ResumoTab';
import ContratosTab from './tabs/ContratosTab';
import FinanceiroTab from './tabs/FinanceiroTab';
import FinanceiroPagoTab from './tabs/FinanceiroPagoTab';
import TermosTab from './tabs/TermosTab';

interface CentralAssinanteTabContentProps {
  activeTab: CentralAssinanteTab;
  dados: DadosCentralAssinante;
  getStatusVariant: (status: string) => 'success' | 'danger' | 'warning' | 'secondary' | 'info';
  getStatusLabel: (status: string) => string;
  baixandoBoletoId: number | null;
  baixandoContratoId: number | null;
  baixandoTermoId: number | null;
  baixandoReciboId: number | null;
  handleVisualizarFatura: (titulo: FaturaVisualizar) => void;
  handleCardClick: (tipo: CentralAssinanteCardTipo) => void;
  handleImprimirContrato: (contratoId: number) => void;
  handleImprimirTermo: (termoId: number) => void;
  handleImprimirFatura: (tituloId: number) => void;
  handleImprimirRecibo: (tituloId: number) => void;
}

const CentralAssinanteTabContent: React.FC<CentralAssinanteTabContentProps> = ({
  activeTab,
  dados,
  getStatusVariant,
  getStatusLabel,
  baixandoBoletoId,
  baixandoContratoId,
  baixandoTermoId,
  baixandoReciboId,
  handleVisualizarFatura,
  handleCardClick,
  handleImprimirContrato,
  handleImprimirTermo,
  handleImprimirFatura,
  handleImprimirRecibo,
}) => (
  <div>
    {activeTab === 'resumo' && (
      <ResumoTab dados={dados} handleCardClick={handleCardClick} />
    )}

    {activeTab === 'contratos' && (
      <ContratosTab
        dados={dados}
        getStatusVariant={getStatusVariant}
        getStatusLabel={getStatusLabel}
        baixandoContratoId={baixandoContratoId}
        handleImprimirContrato={handleImprimirContrato}
      />
    )}

    {activeTab === 'financeiro' && (
      <FinanceiroTab
        dados={dados}
        getStatusVariant={getStatusVariant}
        getStatusLabel={getStatusLabel}
        baixandoBoletoId={baixandoBoletoId}
        handleVisualizarFatura={handleVisualizarFatura}
        handleImprimirFatura={handleImprimirFatura}
      />
    )}

    {activeTab === 'financeiro_pago' && (
      <FinanceiroPagoTab
        dados={dados}
        baixandoBoletoId={baixandoBoletoId}
        baixandoReciboId={baixandoReciboId}
        handleVisualizarFatura={handleVisualizarFatura}
        handleImprimirFatura={handleImprimirFatura}
        handleImprimirRecibo={handleImprimirRecibo}
      />
    )}

    {activeTab === 'termos' && (
      <TermosTab
        dados={dados}
        baixandoTermoId={baixandoTermoId}
        handleImprimirTermo={handleImprimirTermo}
      />
    )}
  </div>
);

export default CentralAssinanteTabContent;
