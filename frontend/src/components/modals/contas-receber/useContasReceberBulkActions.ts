import { useMemo } from 'react';
import { Titulo } from 'types';
import { TituloService } from 'services/tituloService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useBulkBtn } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { BulkAction } from 'components/tables/types';
import { createTituloEnviarAction } from 'components/modals/clientes/contrato/contratoTituloBulkActionHelpers';
import { formatContasReceberCurrency } from './contasReceberListUtils';
import { SelectedParcela, TituloItemUnion } from './contasReceberListTypes';

interface UseContasReceberBulkActionsParams {
  isSaas: boolean;
  selectedItems: TituloItemUnion[];
  setSelectedItems: React.Dispatch<React.SetStateAction<TituloItemUnion[]>>;
  titulos: TituloItemUnion[];
  handleRefreshData: () => Promise<void>;
  setSelectedTituloId: (id: number | null) => void;
  setShowTituloEditModal: (show: boolean) => void;
  setSelectedParcela: (parcela: SelectedParcela | null) => void;
  setShowReceberModal: (show: boolean) => void;
  setSelectedTituloForNFe: (titulo: Titulo | null) => void;
  setShowGerarNFeModal: (show: boolean) => void;
  handleImprimirSelecionados: (items?: TituloItemUnion[]) => Promise<void>;
  handleImprimirRecibos: (items?: TituloItemUnion[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  handleImprimirNFSe: (items: Titulo[]) => Promise<void>;
  getItensComNFSe: (items: Titulo[]) => Titulo[];
}

export function useContasReceberBulkActions({
  isSaas,
  selectedItems,
  setSelectedItems,
  titulos,
  handleRefreshData,
  setSelectedTituloId,
  setShowTituloEditModal,
  setSelectedParcela,
  setShowReceberModal,
  setSelectedTituloForNFe,
  setShowGerarNFeModal,
  handleImprimirSelecionados,
  handleImprimirRecibos,
  handleImprimirTodosEmAberto,
  handleImprimirNFSe,
  getItensComNFSe,
}: UseContasReceberBulkActionsParams) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const hasNFSeEmitida = useMemo(() => {
    return titulos.some(
      (item): item is Titulo =>
        'nfse_status' in item && item.nfse_status === 'emitida' && !!item.nfse_numero
    );
  }, [titulos]);

  const memoizedBulkActions = useMemo(() => {
    const actions: BulkAction<TituloItemUnion>[] = [];

    if (!isSaas) {
      actions.push({
        key: 'editar',
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        onClick: (s: TituloItemUnion[]) => {
          if (s.length > 0) {
            setSelectedTituloId((s[0] as Titulo).id);
            setShowTituloEditModal(true);
          }
        },
        disabled: (s: TituloItemUnion[]): boolean => s.length !== 1,
      });
    }

    actions.push({
      key: 'excluir',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      onClick: (s: TituloItemUnion[]) => {
          (async () => {
            const isDeletavel = (titulo: Titulo) =>
              titulo.status === 'cancelado' ||
              (!titulo.pago &&
                !(
                  titulo.charge_id ||
                  titulo.nosso_numero ||
                  titulo.codigo_barras ||
                  titulo.linha_digitavel ||
                  titulo.url_boleto
                ));
            const deletaveis = (s as Titulo[]).filter(isDeletavel);
            if (deletaveis.length === 0) return;
            const msg =
              deletaveis.length === 1
                ? t('financial.confirmDeleteTitle')
                : t('financial.confirmDeleteTitles', { count: deletaveis.length });
            if (!window.confirm(msg)) return;
            let okCount = 0,
              errCount = 0;
            for (const item of deletaveis) {
              try {
                await TituloService.delete(item.id);
                okCount++;
              } catch {
                errCount++;
              }
            }
            await handleRefreshData();
            setSelectedItems([]);
            if (okCount > 0)
              success(
                okCount === 1
                  ? t('financial.successDeleteTitle')
                  : t('financial.successDeleteTitles', { count: okCount })
              );
            if (errCount > 0)
              showApiError(
                errCount === 1
                  ? t('financial.errorDeleteTitle')
                  : t('financial.errorDeleteTitles', { count: errCount })
              );
          })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        const isDeletavel = (titulo: Titulo) =>
          titulo.status === 'cancelado' ||
          (!titulo.pago &&
            !(
              titulo.charge_id ||
              titulo.nosso_numero ||
              titulo.codigo_barras ||
              titulo.linha_digitavel ||
              titulo.url_boleto
            ));
        return (s as Titulo[]).every((titulo) => !isDeletavel(titulo));
      },
    } as BulkAction<TituloItemUnion>);

    if (!isSaas) {
      actions.push({
        key: 'receber',
        label: bulkBtn.receber.label,
        variant: bulkBtn.receber.variant,
        onClick: (s: TituloItemUnion[]) => {
          if (s.length > 0) {
            const item = s[0] as Titulo;
            setSelectedParcela({
              id: item.id,
              numero_titulo: item.numero_titulo,
              valor_parcela: Number(item.valor_final || item.valor),
              data_vencimento: item.data_vencimento,
              cliente: item.cliente
                ? { razao_social: item.cliente.razao_social || item.cliente.nome_fantasia || '' }
                : undefined,
            });
            setShowReceberModal(true);
          }
        },
        disabled: (s: TituloItemUnion[]): boolean => {
          if (s.length === 0) return true;
          return (s as Titulo[]).every((i) => i.status === 'pago' || i.status === 'cancelado');
        },
      });
    }

    actions.push({
      key: 'cancelar',
      label: bulkBtn.cancelar.label,
      variant: bulkBtn.cancelar.variant,
      onClick: (s: TituloItemUnion[]) => {
          (async () => {
            if (s.length === 0) return;
            const msg =
              s.length === 1
                ? t('messages.confirmCancelTitle')
                : t('messages.confirmCancelTitles', { count: s.length });
            if (!window.confirm(msg)) return;
            let okCount = 0,
              errCount = 0;
            for (const item of s as Titulo[]) {
              try {
                await TituloService.update(item.id, { status: 'cancelado' });
                okCount++;
              } catch {
                errCount++;
              }
            }
            await handleRefreshData();
            setSelectedItems([]);
            if (okCount > 0)
              success(
                okCount === 1
                  ? t('financial.titleCanceled')
                  : `${okCount} ${t('financial.titlesCanceled')}`
              );
            if (errCount > 0)
              showApiError(
                errCount === 1
                  ? t('financial.titleNotCanceled')
                  : `${errCount} ${t('financial.titlesNotCanceled')}`
              );
          })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        return (s as Titulo[]).every(
          (i) => i.status === 'pago' || i.status === 'cancelado'
        );
      },
    } as BulkAction<TituloItemUnion>);

    actions.push({
      key: 'estornar',
      label: bulkBtn.estornar.label,
      variant: bulkBtn.estornar.variant,
      onClick: (s: TituloItemUnion[]) => {
          (async () => {
            if (s.length === 0) return;
            const item = s[0] as Titulo;
            const statusPago =
              item.status === 'pago' || item.status === 'pago_atraso' || item.status === 'parcial';
            if (!statusPago) {
              showApiError(t('financial.canOnlyReversePaid'));
              return;
            }
            const msg = `${t('financial.titleWillReturnPending')}\n\n${t('document.title')} ${item.numero_titulo || item.id}\n${t('summary.value')} ${formatContasReceberCurrency(item.valor_pago || item.valor || 0)}`;
            if (!window.confirm(msg)) return;
            try {
              await TituloService.estornar(item.id);
              success(t('financial.titleReversed'));
              handleRefreshData();
            } catch (err) {
              showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_REVERSE_ERROR);
            }
          })();
      },
      disabled: (s: TituloItemUnion[]): boolean => {
        if (s.length === 0) return true;
        const statusPago = (st: string) =>
          st === 'pago' || st === 'pago_atraso' || st === 'parcial';
        return (s as Titulo[]).every((i) => !statusPago(i.status || ''));
      },
    } as BulkAction<TituloItemUnion>);

    actions.push({
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      dropdown: [
            { label: t('other.selected'), action: (items?: TituloItemUnion[]) => handleImprimirSelecionados(items) },
            { label: t('other.open'), action: () => handleImprimirTodosEmAberto() },
            {
              label: t('other.receipt'),
              action: (items?: TituloItemUnion[]) => handleImprimirRecibos(items),
              disabled: (sel: TituloItemUnion[]) =>
                (sel as Titulo[]).filter((i) => i.status === 'pago' || i.status === 'pago_atraso')
                  .length === 0,
            },
            ...(hasNFSeEmitida
              ? [
                  {
                    label: t('other.printNF'),
                    action: (items?: TituloItemUnion[]) =>
                      handleImprimirNFSe((items || selectedItems) as Titulo[]),
                    disabled: (items: TituloItemUnion[]) =>
                      getItensComNFSe(items as Titulo[]).length === 0,
                  },
                ]
              : []),
          ],
    });

    if (!isSaas) {
      const enviarAction = createTituloEnviarAction({ t, success, showApiError, bulkBtn });
      actions.push({
        key: 'enviar',
        label: enviarAction.label,
        variant: enviarAction.variant,
        disabled: enviarAction.disabled as (s: TituloItemUnion[]) => boolean,
        dropdown: enviarAction.dropdown?.map((item) => ({
          label: item.label,
          action: (items?: TituloItemUnion[]) => {
            const sendAction = item.action as (selectedItems?: Titulo[]) => void | Promise<void>;
            void sendAction(items as Titulo[] | undefined);
          },
          disabled: item.disabled as ((selectedItems: TituloItemUnion[]) => boolean) | boolean | undefined,
        })),
      });
    }

    if (!isSaas) {
      actions.push({
        key: 'nfse',
        label: bulkBtn.nfse.label,
        variant: bulkBtn.nfse.variant,
        disabled: () => selectedItems.length === 0,
        dropdown: [
          {
            label: t('other.generateNFSeStandalone'),
            action: () => {
              if (selectedItems.length === 0) {
                showApiError(t('messages.noTitleSelected'));
                return;
              }
              setSelectedTituloForNFe(selectedItems[0] as Titulo);
              setShowGerarNFeModal(true);
            },
            disabled: () => selectedItems.length === 0,
          },
        ],
      });
    }

    return actions;
  }, [
    isSaas,
    selectedItems,
    success,
    showApiError,
    handleRefreshData,
    handleImprimirSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirRecibos,
    hasNFSeEmitida,
    handleImprimirNFSe,
    getItensComNFSe,
    bulkBtn,
    t,
    setSelectedItems,
    setSelectedTituloId,
    setShowTituloEditModal,
    setSelectedParcela,
    setShowReceberModal,
    setSelectedTituloForNFe,
    setShowGerarNFeModal,
  ]);

  const bulkActions = useMemo(
    () =>
      memoizedBulkActions.map((action) => ({
        label: action.label,
        variant: action.variant,
        action: (items: TituloItemUnion[]) => {
          if (action.onClick) {
            action.onClick(items);
          }
        },
        disabled: action.disabled,
        dropdown: action.dropdown?.map((item) => ({
          label: item.label,
          action: (items?: TituloItemUnion[]) => {
            if (typeof item.action === 'function') {
              item.action(items);
            }
          },
          disabled: item.disabled,
        })),
      })),
    [memoizedBulkActions]
  );

  return {
    bulkActions,
    hasNFSeEmitida,
  };
}
