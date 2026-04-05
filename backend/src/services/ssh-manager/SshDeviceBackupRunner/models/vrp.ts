/**
 * Huawei VRP — comportamento alinhado ao modelo Oxidized VRP.
 */

export const DISPLAY_CMD = 'display current-configuration all';

export const BACKUP_SSH_CMD = `screen-length 0 temporary\r\n${DISPLAY_CMD}\r\n`;

export const OXIDIZED_AUDIT_LABEL = `Huawei VRP: screen-length 0 temporary + ${DISPLAY_CMD}`;

const TS_LINE =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?(\s*[+-]\d{2}:\d{2})?\s*$/;

function cutHead(raw: string): string {
  const s = raw.replace(/^\uFEFF/, '').trim();
  const i = s.indexOf('!Software Version');
  if (i > 0) return s.slice(i).trim();
  if (i === 0) return s;
  const lines = s.split('\n');
  const j = lines.findIndex((line) => /^\s*!/.test(line));
  return j >= 0 ? lines.slice(j).join('\n').trim() : s;
}

function cutTimestamps(cfg: string): string {
  return cfg
    .split(/\r?\n/)
    .filter((line) => !TS_LINE.test(line.trimEnd()))
    .join('\n')
    .trim();
}

function isTailJunk(line: string): boolean {
  return (
    /^<\s*[\w.-]+\s*>$/.test(line) ||
    /^Info:\s/i.test(line) ||
    /----\s*More\s*----/i.test(line)
  );
}

function cutTail(cfg: string): string {
  const lines = cfg.split(/\r?\n/);
  while (lines.length) {
    const line = lines[lines.length - 1].replace(/\r$/, '').trim();
    if (!line || isTailJunk(line)) lines.pop();
    else break;
  }
  return lines.join('\n').trimEnd();
}

function hasConfigBlock(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && (/^\s*!/.test(t) || t.includes('\n!'));
}

function cliHint(raw: string): string | null {
  const t = raw.toLowerCase();
  if (t.includes('unrecognized command') || t.includes('unknown command')) {
    return 'Comando rejeitado pelo equipamento. Teste `display current-configuration` ou `display current-configuration all` no SSH.';
  }
  if (t.includes('the operation timed out') && t.includes('change now')) {
    return 'Troca de senha interativa no login (Change now?) trava o backup automático. Altere a senha no equipamento.';
  }
  return null;
}

/** Sanitiza saída do display; retorna `null` se não houver config reconhecível. */
export function polishBackupOutput(raw: string): string | null {
  const out = cutTail(cutTimestamps(cutHead(raw)));
  if (!hasConfigBlock(out)) return null;
  return out;
}

export function huaweiFailureMessage(raw: string): string {
  return (
    cliHint(raw) ??
    'Backup Huawei sem configuração reconhecível. Resolva avisos no login e tente de novo.'
  );
}
