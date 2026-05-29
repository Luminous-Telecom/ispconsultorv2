import { useState, useMemo } from 'react';
import { Contrato } from '../useContratos';
import { TituloItem } from '../../types/cliente';
import { CarneParcela } from '../../types';
import { UseClienteBulkActionsParams, UseClienteBulkActionsReturn } from './types';
import { usePrintActions } from './printActions';
import { useTituloActions } from './tituloActions';
import { useContratoActions } from './contratoActions';

export function useClienteBulkActions({
  clienteId,
  createdClienteId,
  parcelasData,
  contratosData: _contratosData,
  onRefreshParcelas,
  onRefreshContratos,
  onShowTituloEditModal,
  onShowReceberModal,
  onShowContratoCreateModal,
  onShowContratoEditModal,
  onShowImprimirModal: _onShowImprimirModal,
  handleImprimirTitulosSelecionados,
  handleImprimirTodosEmAberto,
  handleImprimirContrato,
  handleImprimirTermoAdesao,
  handleImprimirContratoPermanencia,
  handleImprimirRecibos,
  onShowGerarNFeModal,
  handleImprimirNF,
}: UseClienteBulkActionsParams): UseClienteBulkActionsReturn {
  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<Contrato[]>([]);

  const effectiveClienteId = clienteId || createdClienteId;

  const getItemsCompletos = useMemo((): CarneParcela[] => {
    if (!parcelasData?.data || selectedItems.length === 0) return [];
    const selectedIds = selectedItems.map(item => item.id);
    return parcelasData.data.filter((item: CarneParcela) => selectedIds.includes(item.id));
  }, [selectedItems, parcelasData]);

  const hasNFSeEmitida = useMemo(() => {
    return getItemsCompletos.some(item => item.nfse_status === 'emitida' && item.nfse_numero);
  }, [getItemsCompletos]);

  const { handleImprimirRecibosWrapper } = usePrintActions({ handleImprimirRecibos });

  const {
    titulosBulkActions,
    handleCancelarTitulos,
    handleEstornarTitulo,
    handleEnviarWhatsApp,
    handleEnviarEmail,
  } = useTituloActions({
    effectiveClienteId,
    selectedItems,
    getItemsCompletos,
    hasNFSeEmitida,
    onRefreshParcelas,
    onShowTituloEditModal,
    onShowReceberModal,
    onShowGerarNFeModal,
    handleImprimirTitulosSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirRecibosWrapper,
    handleImprimirNF,
  });

  const { contratosBulkActions, handleDeletarContratos } = useContratoActions({
    onRefreshContratos,
    setSelectedContratosItems,
    selectedContratosItems,
    onShowContratoCreateModal,
    onShowContratoEditModal,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
  });

  return {
    selectedItems,
    setSelectedItems,
    selectedContratosItems,
    setSelectedContratosItems,
    titulosBulkActions,
    contratosBulkActions,
    handleCancelarTitulos,
    handleEstornarTitulo,
    handleEnviarWhatsApp,
    handleEnviarEmail,
    handleDeletarContratos,
  };
}
