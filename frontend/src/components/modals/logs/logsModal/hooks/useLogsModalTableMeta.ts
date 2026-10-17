import { useMemo, useCallback, useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { normalizeListPagination } from 'utils/pagination';
import { getMensagemHistoricoService } from 'services/mensagemHistoricoService';
import type { BlockdomiLogAcessoItem } from 'services/blockdomiLogAcessoService';
import { idsSelecionadosParaReenvio, type ReenvioSelecionavel } from '../reenviarFalhasCobranca';
import type { useLogsContent } from './useLogsContent';

type LogsContent = ReturnType<typeof useLogsContent>;

interface UseLogsModalTableMetaParams {
  ctx: LogsContent;
  data: unknown;
  isEquipamentos: boolean;
  isEquipamentosOuAgentes: boolean;
  isAuditoria: boolean;
  isEmail: boolean;
  isBlockdomiApi: boolean;
  setShowBlockdomiLogsReal: (v: boolean) => void;
  setWhoisIp: (ip: string | null) => void;
  selectedItem: { id: number | string } | null;
  handleViewDetails: (item: unknown) => void;
  canal: 'email' | 'whatsapp' | null;
  incluirErp: boolean;
}

export function useLogsModalTableMeta({
  ctx,
  data,
  isEquipamentosOuAgentes,
  isAuditoria,
  isEmail,
  isBlockdomiApi,
  setShowBlockdomiLogsReal,
  setWhoisIp,
  selectedItem,
  handleViewDetails,
  canal,
  incluirErp,
}: UseLogsModalTableMetaParams) {
  const { t } = useI18n();
  const { success, info, error } = useNotificationContext();
  const { showApiError } = useApiError();
  const [isResending, setIsResending] = useState(false);
  const { tableFilters, setFilterStartDate, setFilterEndDate, refetch } = ctx;

  const handleSearchChange = useCallback(
    (value: string, field?: string) => {
      setTimeout(() => {
        tableFilters.setSearch(value);
        if (field) tableFilters.setSearchField(field);
        tableFilters.setPage(1);
      }, 0);
    },
    [tableFilters]
  );

  const handleClearFilters = useCallback(() => {
    setTimeout(() => {
      tableFilters.setSearch('');
      tableFilters.setSearchField('');
      setFilterStartDate('');
      setFilterEndDate('');
      tableFilters.setPage(1);
    }, 0);
  }, [tableFilters, setFilterStartDate, setFilterEndDate]);

  const pagination = useMemo(
    () =>
      normalizeListPagination(
        (data as { pagination?: Record<string, unknown> })?.pagination,
        tableFilters.page,
        tableFilters.limit
      ),
    [data, tableFilters.page, tableFilters.limit]
  );

  const modalData = useMemo((): { id: number | string }[] => {
    const d = (data as { data?: unknown[] })?.data ?? [];
    if (isBlockdomiApi) {
      return (d as BlockdomiLogAcessoItem[]) as { id: number | string }[];
    }
    return d as { id: number | string }[];
  }, [data, isBlockdomiApi]);

  const handleReenviarFalhas = useCallback(async (items: unknown[], apenasSelecionados: boolean) => {
    if (!canal || isResending) return;
    const ids = apenasSelecionados
      ? (idsSelecionadosParaReenvio(items as ReenvioSelecionavel[]) ?? [])
      : undefined;
    if (apenasSelecionados && (ids?.length ?? 0) === 0) {
      info(t('history.resendFailuresNotError'));
      return;
    }
    const confirmed = window.confirm(
      apenasSelecionados
        ? t('history.resendFailuresConfirmSelected', { count: ids?.length ?? 0 })
        : t('history.resendFailuresConfirm')
    );
    if (!confirmed) return;

    setIsResending(true);
    try {
      const response = await getMensagemHistoricoService().reenviarFalhas({
        tipo: canal,
        ...(ids ? { ids } : {}),
        ...(incluirErp ? { incluir_erp: true } : {}),
      });
      const data = response.data;
      if (!data || data.total === 0) {
        info(t('history.resendFailuresEmpty'));
      } else if (data.reenviadas === 0 && data.erros === 0) {
        info(t('history.resendFailuresSkipped'));
      } else if (data.reenviadas === 0) {
        error(t('history.resendFailuresFailed', { failed: data.erros }));
      } else {
        success(t('history.resendFailuresDone', { sent: data.reenviadas, failed: data.erros }));
      }
      refetch();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.MENSAGEM_RESEND_ERROR);
    } finally {
      setIsResending(false);
    }
  }, [canal, isResending, incluirErp, info, t, error, success, refetch, showApiError]);

  const bulkActions = useMemo(() => {
    if (isBlockdomiApi) {
      return [
        {
          label: t('blockdomi.logsReal'),
          variant: 'primary' as const,
          disabled: () => false,
          requiresSelection: false,
          action: () => setShowBlockdomiLogsReal(true),
        },
        {
          label: t('blockdomi.whois'),
          variant: 'primary' as const,
          disabled: (items: unknown[]) =>
            items.length !== 1 || !(items[0] as BlockdomiLogAcessoItem)?.ip?.trim(),
          requiresSelection: true,
          action: (items: unknown[]) => {
            const ip = (items[0] as BlockdomiLogAcessoItem)?.ip?.trim();
            if (ip) setWhoisIp(ip);
          },
        },
      ];
    }
    const visualizar = {
      label: isAuditoria ? t('audit.viewDetails') : t('history.view'),
      variant: 'primary' as const,
      disabled: (items: unknown[]) => items.length === 0 && !selectedItem,
      requiresSelection: true,
      action: (items: unknown[]) => {
        const it = items.length > 0 ? items[0] : selectedItem;
        if (it) handleViewDetails(it);
      },
    };
    if (!canal) return [visualizar];
    return [
      visualizar,
      {
        label: t('history.resendFailures'),
        variant: 'primary' as const,
        disabled: () => isResending,
        requiresSelection: false,
        dropdown: [
          {
            label: t('buttons.selected'),
            disabled: (items: unknown[]) => (idsSelecionadosParaReenvio(items as ReenvioSelecionavel[]) ?? []).length === 0,
            action: (items?: unknown[]) => {
              void handleReenviarFalhas(items ?? [], true);
            },
          },
          {
            label: t('history.resendAllErrors'),
            disabled: () => isResending,
            action: () => {
              void handleReenviarFalhas([], false);
            },
          },
        ],
      },
    ];
  }, [t, selectedItem, handleViewDetails, isAuditoria, isBlockdomiApi, setShowBlockdomiLogsReal, setWhoisIp, canal, isResending, handleReenviarFalhas]);

  const emptyMessage = isEquipamentosOuAgentes
    ? 'Nenhum log encontrado'
    : isBlockdomiApi
      ? t('blockdomi.logsEmpty')
      : isAuditoria
        ? 'Nenhum log encontrado'
        : t('history.noMessages');

  const searchFields = isAuditoria
    ? [
        { key: 'id' as const, label: t('table.id') },
        { key: 'timestamp', label: t('audit.timestamp') },
        { key: 'usuario_nome', label: t('table.name') },
        { key: 'usuario_email', label: t('audit.user') },
        { key: 'ip_address', label: t('audit.ip') },
        { key: 'acao', label: t('table.action') },
        { key: 'entidade', label: t('audit.entity') },
      ]
    : isBlockdomiApi
      ? [
          { key: 'id', label: t('table.id') },
          { key: 'ip', label: t('blockdomi.logsIp') },
          { key: 'rota', label: t('blockdomi.logsRota') },
          { key: 'mensagem_erro', label: t('blockdomi.logsMensagemErro') },
        ]
      : [
          { key: 'id', label: t('table.id') },
          { key: 'cliente_nome', label: t('history.client') },
          { key: 'destinatario', label: isEmail ? t('history.recipient') : t('history.phone') },
          { key: 'mensagem', label: t('history.message') },
          { key: 'status', label: t('history.status') },
        ];

  const defaultSearchField = isBlockdomiApi ? 'ip' : isAuditoria ? 'timestamp' : 'destinatario';
  const searchPlaceholder =
    isBlockdomiApi || isAuditoria
      ? t('layout.searchPlaceholder')
      : isEmail
        ? t('history.searchEmail')
        : t('history.searchPhone');

  return {
    handleSearchChange,
    handleClearFilters,
    pagination,
    modalData,
    bulkActions,
    emptyMessage,
    searchFields,
    defaultSearchField,
    searchPlaceholder,
  };
}
