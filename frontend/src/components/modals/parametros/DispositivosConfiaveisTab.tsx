import React, { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import type { TableConfig } from 'components/tables/types';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { authService, type TwoFactorTrustedDevice } from 'services/authService';
import { useI18n } from 'contexts/I18nContext';
import { CACHE_CONFIG } from 'config/api';

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatDeviceIp = (ip: string | null | undefined) => {
  if (!ip?.trim()) return '—';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
};

/** Compatível com rótulos antigos que gravavam o User-Agent completo. */
const deviceLabel = (raw: string | null | undefined, fallback: string) => {
  if (!raw?.trim()) return fallback;
  if (!/^Mozilla\//i.test(raw)) return raw;
  if (/Edg\//.test(raw)) return 'Edge · Windows';
  if (/Chrome\//.test(raw)) {
    if (/Android/.test(raw)) return 'Chrome · Android';
    if (/Windows/.test(raw)) return 'Chrome · Windows';
    if (/Mac OS X|Macintosh/.test(raw)) return 'Chrome · macOS';
    if (/Linux/.test(raw)) return 'Chrome · Linux';
    return 'Chrome';
  }
  if (/Firefox\//.test(raw)) return 'Firefox';
  if (/Safari\//.test(raw)) return 'Safari';
  return fallback;
};

const DispositivosConfiaveisTab: React.FC = () => {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const { handleSelectionChange } = useModalSelect<TwoFactorTrustedDevice>(undefined);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 50,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['auth-2fa-status'],
    queryFn: async () => {
      const res = await authService.getTwoFactorStatus();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Falha ao carregar dispositivos');
      }
      return res.data;
    },
    staleTime: 0,
    gcTime: CACHE_CONFIG.DEFAULT_CACHE_TIME,
  });

  const devices = useMemo(
    (): TwoFactorTrustedDevice[] => status?.trusted_devices ?? [],
    [status?.trusted_devices]
  );

  const invalidateStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['auth-2fa-status'] });
  }, [queryClient]);

  const handleRevoke = useCallback(
    async (selectedItems: TwoFactorTrustedDevice[]) => {
      if (selectedItems.length === 0) return;
      if (selectedItems.length === 1) {
        if (!window.confirm(t('security.trustedDeviceRemoveConfirm'))) return;
      } else if (!window.confirm(t('security.trustedDevicesRevokeAllConfirm'))) {
        return;
      }
      try {
        for (const item of selectedItems) {
          const res = await authService.revokeTrustedDevice(item.id);
          if (!res.success) {
            showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
            return;
          }
        }
        success(
          selectedItems.length === 1
            ? t('security.trustedDeviceRemovedSuccess')
            : t('security.trustedDevicesRevokeAllSuccess')
        );
        invalidateStatus();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
      }
    },
    [invalidateStatus, showApiError, success, t]
  );

  const handleRevokeAll = useCallback(async () => {
    if (devices.length === 0) return;
    if (!window.confirm(t('security.trustedDevicesRevokeAllConfirm'))) return;
    try {
      const res = await authService.revokeAllTrustedDevices();
      if (!res.success) {
        showApiError(res.message || CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
        return;
      }
      success(t('security.trustedDevicesRevokeAllSuccess'));
      invalidateStatus();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR);
    }
  }, [devices.length, invalidateStatus, showApiError, success, t]);

  const filteredDevices = useMemo(() => {
    const search = (tableFilters.search || '').toLowerCase().trim();
    let result = devices.map((d) => ({
      ...d,
      navegador: deviceLabel(d.label, t('security.trustedDeviceUnknown')),
      ip_display: formatDeviceIp(d.ip),
    }));
    if (search) {
      const field = tableFilters.searchField || 'navegador';
      result = result.filter((item) => {
        const raw =
          field === 'id'
            ? String(item.id)
            : field === 'ip'
              ? item.ip_display
              : field === 'navegador'
                ? item.navegador
                : String((item as unknown as Record<string, unknown>)[field] ?? '');
        return raw.toLowerCase().includes(search);
      });
    }
    const col = tableFilters.sortColumn;
    const dir = tableFilters.sortDirection;
    if (!col) return result;
    return [...result].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[col];
      const bv = (b as unknown as Record<string, unknown>)[col];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [devices, tableFilters.search, tableFilters.searchField, tableFilters.sortColumn, tableFilters.sortDirection, t]);

  type DeviceRow = TwoFactorTrustedDevice & { navegador: string; ip_display: string };

  const bulkActions = useMemo(
    () => [
      {
        key: 'deletar',
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: DeviceRow[]) => items.length === 0,
        onClick: (selectedItems: DeviceRow[]) => {
          void handleRevoke(selectedItems);
        },
      },
      {
        key: 'remover-todos',
        label: t('security.trustedDevicesRevokeAll'),
        variant: 'danger' as const,
        requiresSelection: false,
        disabled: () => devices.length === 0,
        onClick: () => {
          void handleRevokeAll();
        },
      },
    ],
    [bulkBtn.deletar.label, bulkBtn.deletar.variant, devices.length, handleRevoke, handleRevokeAll, t]
  );

  const tableColumns: TableConfig<DeviceRow>['columns'] = useMemo(
    () => [
      {
        key: 'navegador',
        label: t('security.trustedDevicesSection'),
        sortable: true,
        render: (item) => item.navegador,
      },
      {
        key: 'ip',
        label: t('security.trustedDeviceIp'),
        sortable: true,
        width: '140px',
        render: (item) => item.ip_display,
      },
      {
        key: 'created_at',
        label: t('security.trustedDeviceSavedAt'),
        sortable: true,
        render: (item) => formatDateTime(item.created_at),
      },
      {
        key: 'expires_at',
        label: t('security.trustedDeviceExpires'),
        sortable: true,
        render: (item) => formatDateTime(item.expires_at),
      },
    ],
    [t]
  );

  return (
    <EmbeddedTablePanel<DeviceRow>
      config={{
        columns: tableColumns,
        data: filteredDevices,
        loading: isLoading,
        searchable: true,
        searchPlaceholder: '',
        searchField: tableFilters.searchField || 'navegador',
        searchFields: [
          { key: 'navegador', label: t('security.trustedDevicesSection') },
          { key: 'ip', label: t('security.trustedDeviceIp') },
        ],
        sortable: true,
        sortColumn: tableFilters.sortColumn,
        sortDirection: tableFilters.sortDirection,
        striped: true,
        hover: true,
        responsive: true,
        selectable: true,
        multiSelect: true,
        bulkActions,
        emptyMessage: t('security.trustedDevicesEmpty'),
        pagination: undefined,
        className: 'no-padding',
      }}
      tableId="dispositivos-confiaveis-table"
      onSelectionChange={handleSelectionChange}
      onRefresh={() => {
        void refetch();
      }}
      onSort={(column, direction) => {
        setTimeout(() => tableFilters.setSort(column, direction), 0);
      }}
      onSearch={(s, f) => {
        tableFilters.setSearch(s);
        if (f) tableFilters.setSearchField(f);
      }}
      onSearchFieldChange={(f) => tableFilters.setSearchField(f)}
      search={tableFilters.search}
    />
  );
};

export default DispositivosConfiaveisTab;
