/**
 * Hook para gerenciar contratos do cliente
 * Centraliza busca, filtros e operações relacionadas a contratos
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContratoService } from '../services/contratoService';
import { Contrato } from './useContratos';

interface UseClienteContratosParams {
  clienteId: number | null;
  createdClienteId: number | null;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

interface UseClienteContratosReturn {
  // Dados de contratos
  contratosData: Contrato[] | undefined;
  isLoadingContratos: boolean;
  
  // Estados de filtros
  showInativosContratos: boolean;
  setShowInativosContratos: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Dados processados (com filtros aplicados)
  sortedContratosData: Contrato[];
  
  // Operações
  refetchContratos: () => void;
  
  // ID efetivo do cliente (clienteId ou createdClienteId)
  effectiveClienteId: number | undefined;
  
  // Flag para habilitar edição de contratos
  canEditContratos: boolean;
}

export const useClienteContratos = ({
  clienteId,
  createdClienteId,
  sortColumn,
  sortDirection
}: UseClienteContratosParams): UseClienteContratosReturn => {
  const [showInativosContratos, setShowInativosContratos] = useState(false);

  // Determinar ID efetivo do cliente (usar clienteId quando editando, ou createdClienteId quando criou)
  const effectiveClienteId = clienteId || createdClienteId || undefined;

  // Buscar contratos com ordenação no backend
  const { data: contratosData, isLoading: isLoadingContratos, refetch: refetchContratos } = useQuery({
    queryKey: ['contratos', effectiveClienteId, sortColumn, sortDirection],
    queryFn: () => effectiveClienteId ? ContratoService.getByCliente(effectiveClienteId, { sortColumn, sortDirection }) : ContratoService.getAtivos(),
    enabled: !!effectiveClienteId,
  });

  // Flag para habilitar edição de contratos
  const canEditContratos = useMemo(() => {
    return !!clienteId || !!createdClienteId;
  }, [clienteId, createdClienteId]);

  // Processar dados de contratos - aplicar filtros se necessário
  const sortedContratosData = useMemo(() => {
    if (!contratosData) return [];

    // Se não estiver mostrando inativos, filtrar apenas ativos
    if (!showInativosContratos) {
      return contratosData.filter(contrato => contrato.status === 'ativo');
    }

    // Se estiver mostrando inativos, retornar todos
    return contratosData;
  }, [contratosData, showInativosContratos]);

  return {
    contratosData,
    isLoadingContratos,
    showInativosContratos,
    setShowInativosContratos,
    sortedContratosData,
    refetchContratos,
    effectiveClienteId,
    canEditContratos
  };
};

