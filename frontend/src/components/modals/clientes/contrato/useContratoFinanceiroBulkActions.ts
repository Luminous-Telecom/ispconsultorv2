import { useMemo } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useBulkBtn } from 'components/ui';
import { ContratoService } from 'services/contratoService';
import { Titulo } from 'types';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { BulkAction } from './types';
import {
  createTituloCancelarAction,
  createTituloEditAction,
  createTituloEnviarAction,
  createTituloEstornarAction,
  createTituloImprimirAction,
  createTituloReceberAction,
} from './contratoTituloBulkActionHelpers';

export interface UseContratoFinanceiroBulkActionsParams {
  isEditMode: boolean;
  internalContratoId: number | null;
  isGerandoFinanceiro: boolean;
  setIsGerandoFinanceiro: (value: boolean) => void;
  queryClient: QueryClient;
  refetchTitulos: () => Promise<unknown>;
  refetchTitulosAvulsos: () => Promise<unknown>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  setSelectedAvulsosItems: React.Dispatch<React.SetStateAction<Titulo[]>>;
  setSelectedTituloId: (id: number) => void;
  setShowTituloEditModal: (show: boolean) => void;
  setSelectedParcela: (parcela: Titulo | null) => void;
  setShowReceberModal: (show: boolean) => void;
  setShowTituloCreateModal: (show: boolean) => void;
  handleImprimirSelecionados: () => void | Promise<void>;
  handleImprimirTodosEmAberto: () => void | Promise<void>;
  handleImprimirSelecionadosAvulsos: () => void | Promise<void>;
  handleImprimirTodosEmAbertoAvulsos: () => void | Promise<void>;
}

export function useContratoFinanceiroBulkActions({
  isEditMode,
  internalContratoId,
  isGerandoFinanceiro,
  setIsGerandoFinanceiro,
  queryClient,
  refetchTitulos,
  refetchTitulosAvulsos,
  setSelectedItems,
  setSelectedAvulsosItems,
  setSelectedTituloId,
  setShowTituloEditModal,
  setSelectedParcela,
  setShowReceberModal,
  setShowTituloCreateModal,
  handleImprimirSelecionados,
  handleImprimirTodosEmAberto,
  handleImprimirSelecionadosAvulsos,
  handleImprimirTodosEmAbertoAvulsos,
}: UseContratoFinanceiroBulkActionsParams) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const ctx = useMemo(
    () => ({ t, success, showApiError, bulkBtn }),
    [t, success, showApiError, bulkBtn]
  );

  const bulkActions: BulkAction<Titulo>[] = useMemo(() => {
    if (!isEditMode) return [];

    const sharedVariant = {
      internalContratoId,
      queryClient,
      refetch: refetchTitulos,
      invalidateQueryKey: ['titulos', 'contrato', internalContratoId] as (string | number | null | undefined)[],
      clearSelection: () => setSelectedItems([]),
    };

    return [
      {
        label: t('financial.generateTitles'),
        variant: 'primary',
        requiresSelection: false,
        disabled: () => isGerandoFinanceiro,
        action: async () => {
          if (!internalContratoId) return;
          setIsGerandoFinanceiro(true);
          try {
            const resultado = await ContratoService.gerarTitulos(internalContratoId);
            success(resultado.message);
            await queryClient.invalidateQueries({ queryKey: ['titulos', 'contrato', internalContratoId] });
            refetchTitulos();
          } catch (err) {
            showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_FINANCIAL_ERROR);
          } finally {
            setIsGerandoFinanceiro(false);
          }
        },
      },
      createTituloEditAction(ctx, setSelectedTituloId, setShowTituloEditModal),
      createTituloReceberAction(ctx, setSelectedParcela, setShowReceberModal),
      createTituloCancelarAction(ctx, sharedVariant),
      createTituloEstornarAction(ctx, sharedVariant),
      createTituloImprimirAction(ctx, handleImprimirSelecionados, handleImprimirTodosEmAberto),
      createTituloEnviarAction(ctx),
    ];
  }, [
    isEditMode,
    internalContratoId,
    isGerandoFinanceiro,
    setIsGerandoFinanceiro,
    queryClient,
    refetchTitulos,
    setSelectedItems,
    setSelectedTituloId,
    setShowTituloEditModal,
    setSelectedParcela,
    setShowReceberModal,
    handleImprimirSelecionados,
    handleImprimirTodosEmAberto,
    ctx,
    t,
    success,
    showApiError,
  ]);

  const bulkActionsAvulsos: BulkAction<Titulo>[] = useMemo(() => {
    if (!isEditMode) return [];

    const avulsoVariant = {
      internalContratoId,
      queryClient,
      refetch: refetchTitulosAvulsos,
      invalidateQueryKey: ['titulos', 'contrato', internalContratoId, 'avulsos'] as (
        | string
        | number
        | null
        | undefined
      )[],
      clearSelection: () => setSelectedAvulsosItems([]),
    };

    return [
      {
        label: t('other.newMiscTitle'),
        action: () => setShowTituloCreateModal(true),
      },
      createTituloEditAction(ctx, setSelectedTituloId, setShowTituloEditModal),
      createTituloReceberAction(ctx, setSelectedParcela, setShowReceberModal),
      createTituloCancelarAction(ctx, avulsoVariant),
      createTituloEstornarAction(ctx, avulsoVariant),
      createTituloImprimirAction(ctx, handleImprimirSelecionadosAvulsos, handleImprimirTodosEmAbertoAvulsos),
      createTituloEnviarAction(ctx),
    ];
  }, [
    isEditMode,
    internalContratoId,
    queryClient,
    refetchTitulosAvulsos,
    setSelectedAvulsosItems,
    setSelectedTituloId,
    setShowTituloEditModal,
    setSelectedParcela,
    setShowReceberModal,
    setShowTituloCreateModal,
    handleImprimirSelecionadosAvulsos,
    handleImprimirTodosEmAbertoAvulsos,
    ctx,
    t,
  ]);

  return { bulkActions, bulkActionsAvulsos };
}
