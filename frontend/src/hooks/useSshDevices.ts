import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SshDeviceService } from '../services/sshDeviceService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useI18n } from '../contexts/I18nContext';
import { SshDeviceFilters, UpdateSshDevice } from '../types';
import { AxiosError } from 'axios';

function getErrorMessage(err: unknown, fallback: string): string {
  const withMessage = err as { message?: string };
  if (typeof withMessage?.message === 'string' && withMessage.message.trim()) {
    return withMessage.message;
  }
  const axiosErr = err as AxiosError<{ message?: string }>;
  if (axiosErr.response?.data?.message) {
    return axiosErr.response.data.message;
  }
  return fallback;
}

export const useSshDevices = (filters: SshDeviceFilters = {}) => {
  return useQuery({
    queryKey: ['ssh-devices', filters],
    queryFn: () => SshDeviceService.list(filters),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSshDevice = (id: string) => {
  return useQuery({
    queryKey: ['ssh-device', id],
    queryFn: () => SshDeviceService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useCreateSshDevice = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: SshDeviceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
      success('Device SSH salvo com sucesso!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao salvar device SSH')),
  });
};

export const useUpdateSshDevice = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSshDevice }) =>
      SshDeviceService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
      queryClient.invalidateQueries({ queryKey: ['ssh-device', id] });
      success('Device SSH atualizado com sucesso!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao atualizar device SSH')),
  });
};

export const useDeleteSshDevice = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  return useMutation({
    mutationFn: SshDeviceService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssh-devices'] });
      success('Device SSH removido com sucesso!');
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao remover device SSH')),
  });
};

export const useTestSshDevice = () => {
  const { error } = useNotificationContext();

  return useMutation({
    mutationFn: SshDeviceService.testConnection,
    onSuccess: (result) => {
      if (!result.success) {
        error(result.error ?? 'Falha na conexão');
      }
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao testar conexão')),
  });
};

export const useQueueManualSshDeviceBackup = () => {
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const { t } = useI18n();

  return useMutation({
    mutationFn: (id: string) => SshDeviceService.queueManualBackup(id),
    onSuccess: (data, deviceId) => {
      queryClient.invalidateQueries({ queryKey: ['ssh-device-backups'] });
      success(data.message?.trim() || t('sshDevice.manualBackupQueued'));
      queryClient.invalidateQueries({ queryKey: ['ssh-device', deviceId] });
    },
    onError: (err) => error(getErrorMessage(err, 'Erro ao executar backup')),
  });
};
