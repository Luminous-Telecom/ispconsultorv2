import { QueryClient } from '@tanstack/react-query';
import { TranslationKeys } from 'contexts/I18nContext';
import { TituloService } from 'services/tituloService';
import { Titulo } from 'types';
import { formatCurrency } from 'utils/formatters';
import { BulkAction } from './types';

type TranslateFn = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;

interface BulkActionContext {
  t: TranslateFn;
  success: (message: string) => void;
  showApiError: (message: unknown, context?: string) => void;
  bulkBtn: ReturnType<typeof import('components/ui').useBulkBtn>;
}

interface TituloListVariant {
  internalContratoId: number | null;
  queryClient: QueryClient;
  refetch: () => Promise<unknown>;
  invalidateQueryKey: (string | number | null | undefined)[];
  clearSelection: () => void;
}

export function createTituloEditAction(
  ctx: BulkActionContext,
  setSelectedTituloId: (id: number) => void,
  setShowTituloEditModal: (show: boolean) => void
): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.editar.label,
    variant: ctx.bulkBtn.editar.variant,
    action: (selectedItems: Titulo[]) => {
      if (selectedItems.length > 0) {
        const item = selectedItems[0];
        setSelectedTituloId(item.id);
        setShowTituloEditModal(true);
      }
    },
    disabled: (selectedItems: Titulo[]) => selectedItems.length !== 1,
  };
}

export function createTituloReceberAction(
  ctx: BulkActionContext,
  setSelectedParcela: (parcela: Titulo | null) => void,
  setShowReceberModal: (show: boolean) => void
): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.receber.label,
    variant: ctx.bulkBtn.receber.variant,
    action: (selectedItems: Titulo[]) => {
      if (selectedItems.length > 0) {
        setSelectedParcela(selectedItems[0]);
        setShowReceberModal(true);
      }
    },
    disabled: (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return true;
      return selectedItems.every((item) => item.status === 'pago' || item.status === 'cancelado');
    },
  };
}

export function createTituloCancelarAction(
  ctx: BulkActionContext,
  variant: TituloListVariant
): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.cancelar.label,
    variant: ctx.bulkBtn.cancelar.variant,
    action: async (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return;
      const confirmMessage =
        selectedItems.length === 1
          ? ctx.t('messages.confirmCancelTitle')
          : ctx.t('messages.confirmCancelTitles', { count: selectedItems.length });
      if (!window.confirm(confirmMessage)) return;

      try {
        let successCount = 0;
        let errorCount = 0;
        for (const item of selectedItems) {
          try {
            await TituloService.update(item.id, { status: 'cancelado' });
            successCount++;
          } catch {
            errorCount++;
          }
        }
        await variant.queryClient.invalidateQueries({ queryKey: variant.invalidateQueryKey });
        await variant.refetch();
        variant.clearSelection();
        if (successCount > 0) {
          ctx.success(
            successCount === 1
              ? ctx.t('messages.successCancelTitle')
              : ctx.t('messages.successCancelTitles', { count: successCount })
          );
        }
        if (errorCount > 0) {
          ctx.showApiError(
            errorCount === 1
              ? ctx.t('messages.errorCancelTitle')
              : ctx.t('messages.errorCancelTitles', { count: errorCount })
          );
        }
      } catch {
        ctx.showApiError(ctx.t('messages.errorCancelTitlesGeneral'));
      }
    },
    disabled: (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return true;
      return selectedItems.every((item) => item.status === 'pago' || item.status === 'cancelado');
    },
  };
}

export function createTituloEstornarAction(
  ctx: BulkActionContext,
  variant: Pick<TituloListVariant, 'internalContratoId' | 'queryClient' | 'invalidateQueryKey'>
): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.estornar.label,
    variant: ctx.bulkBtn.estornar.variant,
    action: async (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return;
      const item = selectedItems[0];
      if (item.status !== 'pago') {
        ctx.showApiError(ctx.t('financial.canOnlyReversePaid'));
        return;
      }
      const msg = `${ctx.t('financial.confirmReverse', { number: item.numero_titulo })}\n\n${ctx.t('form.value')}: ${formatCurrency(item.valor_pago || item.valor || 0)}\n${ctx.t('financial.titleWillReturnPending')}`;
      if (!window.confirm(msg)) return;
      try {
        await TituloService.estornar(item.id);
        ctx.success(ctx.t('messages.successReverseTitle'));
        variant.queryClient.invalidateQueries({ queryKey: variant.invalidateQueryKey });
      } catch (err) {
        ctx.showApiError(err instanceof Error ? err.message : ctx.t('messages.errorReverseTitle'));
      }
    },
    disabled: (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return true;
      return selectedItems.every((item) => item.status !== 'pago');
    },
  };
}

export function createTituloImprimirAction(
  ctx: BulkActionContext,
  handleImprimirSelecionados: () => void | Promise<void>,
  handleImprimirTodosEmAberto: () => void | Promise<void>
): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.imprimir.label,
    variant: ctx.bulkBtn.imprimir.variant,
    disabled: () => false,
    dropdown: [
      { label: ctx.t('other.selected'), action: handleImprimirSelecionados },
      { label: ctx.t('other.open'), action: handleImprimirTodosEmAberto },
    ],
  };
}

async function enviarTitulos(
  items: Titulo[],
  enviar: (id: number) => Promise<{ success: boolean; message?: string }>,
  ctx: BulkActionContext,
  successKeys: { one: keyof TranslationKeys; many: keyof TranslationKeys },
  errorKeys: { one: keyof TranslationKeys; many: keyof TranslationKeys; general: keyof TranslationKeys }
) {
  if (items.length === 0) return;
  try {
    let successCount = 0;
    let errorCount = 0;
    let firstErrorMessage = '';
    for (const item of items) {
      if (item.status === 'cancelado') continue;
      try {
        const response = await enviar(item.id);
        if (response.success) successCount++;
        else {
          errorCount++;
          if (!firstErrorMessage && response.message) firstErrorMessage = response.message;
        }
      } catch (err) {
        errorCount++;
        if (!firstErrorMessage) {
          if (err && typeof err === 'object' && 'message' in err) {
            firstErrorMessage = (err as { message: string }).message;
          } else if (err instanceof Error) {
            firstErrorMessage = err.message;
          }
        }
      }
    }
    if (successCount > 0) {
      ctx.success(
        successCount === 1 ? ctx.t(successKeys.one) : ctx.t(successKeys.many, { count: successCount })
      );
    }
    if (errorCount > 0) {
      ctx.showApiError(
        firstErrorMessage ||
          (errorCount === 1 ? ctx.t(errorKeys.one) : ctx.t(errorKeys.many, { count: errorCount }))
      );
    }
  } catch {
    ctx.showApiError(ctx.t(errorKeys.general));
  }
}

export function createTituloEnviarAction(ctx: BulkActionContext): BulkAction<Titulo> {
  return {
    label: ctx.bulkBtn.enviar.label,
    variant: ctx.bulkBtn.enviar.variant,
    disabled: (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) return true;
      return selectedItems.every((item) => item.status === 'cancelado');
    },
    dropdown: [
      {
        label: ctx.t('other.viaWhatsApp'),
        action: async (selectedItems?: Titulo[]) => {
          await enviarTitulos(
            selectedItems || [],
            TituloService.enviarWhatsApp,
            ctx,
            { one: 'messages.successSendMessage', many: 'messages.successSendMessages' },
            { one: 'messages.errorSendMessage', many: 'messages.errorSendMessages', general: 'messages.errorSendMessagesGeneral' }
          );
        },
      },
      {
        label: ctx.t('other.viaEmail'),
        action: async (selectedItems?: Titulo[]) => {
          await enviarTitulos(
            selectedItems || [],
            TituloService.enviarEmail,
            ctx,
            { one: 'messages.successSendEmail', many: 'messages.successSendEmails' },
            { one: 'messages.errorSendEmail', many: 'messages.errorSendEmails', general: 'messages.errorSendEmailsGeneral' }
          );
        },
      },
    ],
  };
}
