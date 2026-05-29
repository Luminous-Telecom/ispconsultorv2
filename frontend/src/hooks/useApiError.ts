import { useCallback } from 'react';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import {
  extractApiErrorMessageSync,
  type ApiErrorHelperOptions,
} from '../utils/apiErrorHelper';
import { ERROR_MESSAGES } from '../constants/ErrorMessages';

type ApiErrorOptions = Omit<ApiErrorHelperOptions, 'defaultMessage' | 'handleBlobResponse'>;

export function useApiError() {
  const { error: notifyError } = useNotificationContext();

  const showApiError = useCallback(
    (
      err: unknown,
      defaultMessage: string = ERROR_MESSAGES.GENERIC_ERROR,
      options?: ApiErrorOptions
    ) => {
      notifyError(extractApiErrorMessageSync(err, { ...options, defaultMessage }));
    },
    [notifyError]
  );

  return { showApiError };
}
