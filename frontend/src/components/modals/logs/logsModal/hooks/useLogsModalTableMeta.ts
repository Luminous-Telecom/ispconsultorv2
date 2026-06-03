import { useMemo, useCallback } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { normalizeListPagination } from 'utils/pagination';
import type { BlockdomiLogAcessoItem } from 'services/blockdomiLogAcessoService';
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
}

export function useLogsModalTableMeta({
  ctx,
  data,
  isEquipamentos,
  isEquipamentosOuAgentes,
  isAuditoria,
  isEmail,
  isBlockdomiApi,
  setShowBlockdomiLogsReal,
  setWhoisIp,
  selectedItem,
  handleViewDetails,
}: UseLogsModalTableMetaParams) {
  const { t } = useI18n();
  const { tableFilters, setFilterStartDate, setFilterEndDate } = ctx;

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
    return [
      {
        label: isAuditoria ? t('audit.viewDetails') : t('history.view'),
        variant: 'primary' as const,
        disabled: (items: unknown[]) => items.length === 0 && !selectedItem,
        requiresSelection: true,
        action: (items: unknown[]) => {
          const it = items.length > 0 ? items[0] : selectedItem;
          if (it) handleViewDetails(it);
        },
      },
    ];
  }, [t, selectedItem, handleViewDetails, isAuditoria, isBlockdomiApi, setShowBlockdomiLogsReal, setWhoisIp]);

  const title = isEquipamentosOuAgentes
    ? isEquipamentos
      ? t('logs.equipamentos')
      : t('logs.agentes')
    : isAuditoria
      ? t('audit.title')
      : isBlockdomiApi
        ? t('blockdomi.logsApi')
        : isEmail
          ? t('history.emailTitle')
          : t('history.whatsappTitle');

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
    title,
    emptyMessage,
    searchFields,
    defaultSearchField,
    searchPlaceholder,
  };
}
