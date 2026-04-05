/**
 * MikroTik RouterOS — comportamento alinhado ao modelo Oxidized RouterOS.
 */

export const PACKAGE_PROBE_CMD = '/system package update print';

export const OXIDIZED_AUDIT_BASE = 'RouterOS: package print + export';

function hideSensitiveEnv(): boolean {
  const v = process.env.MIKROTIK_BACKUP_HIDE_SENSITIVE ?? '';
  return v === '1' || /^true$/i.test(v);
}

export function parseRouterOsMajorFromPackageUpdatePrint(out: string): number | null {
  const line = out.split(/\r?\n/).find((l) => /installed-version:\s|current-version:\s/i.test(l));
  if (!line) return null;
  const m = line.match(/\d/);
  return m ? parseInt(m[0], 10) : null;
}

export function buildExportCommand(major: number | null): string {
  if (hideSensitiveEnv()) return '/export hide-sensitive';
  if (major != null && major >= 7) return '/export show-sensitive';
  return '/export';
}

export function polishExportOutput(cfg: string): string {
  let s = cfg.replace(/\x1B\[[0-9;]*[mK]/g, '');
  s = s.replace(/\\\r?\n\s+/g, '');
  for (const re of [
    /# inactive time\r?\n/g,
    /# received packet from \S+ bad format\r?\n/g,
    /# poe-out status: short_circuit\r?\n/g,
    /# Firmware upgraded successfully, please reboot for changes to take effect!\r?\n/g,
    /# \S+ not ready\r?\n/g,
    /# .+ please restart the device in order to apply the new setting\r?\n/g,
  ]) {
    s = s.replace(re, '');
  }
  const lines = s.split(/\r?\n/).filter(
    (line) => !/^#\s\w{3}\/\d{2}\/\d{4}/.test(line) && !/^#\s\d{4}-\d{2}-\d{2}/.test(line)
  );
  const body = lines.map((l) => l.replace(/\s+$/, '')).join('\n').trimEnd();
  return body ? `${body}\n` : '';
}
