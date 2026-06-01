export const SSH_BACKUP_TEXT_PREVIEW_EXTENSIONS = ['.rsc', '.txt', '.cfg', '.conf', '.log'];

export function isSshBackupTextPreviewSupported(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SSH_BACKUP_TEXT_PREVIEW_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function formatSshBackupBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / k ** i).toFixed(i === 0 ? 0 : 1))} ${sizes[i]}`;
}
