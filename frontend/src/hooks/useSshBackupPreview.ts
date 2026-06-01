import { useCallback, useState } from 'react';
import { SshDeviceBackupService } from 'services/sshDeviceBackupService';

export function useSshBackupPreview() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const openPreview = useCallback(async (deviceId: string, fileName: string, title: string) => {
    setShowPreview(true);
    setPreviewContent(null);
    setPreviewError(null);
    setPreviewTitle(title);
    setPreviewLoading(true);
    try {
      const text = await SshDeviceBackupService.fetchAsText(deviceId, fileName);
      setPreviewContent(text);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewContent(null);
    setPreviewError(null);
  }, []);

  return {
    showPreview,
    previewContent,
    previewLoading,
    previewError,
    previewTitle,
    openPreview,
    closePreview,
  };
}
