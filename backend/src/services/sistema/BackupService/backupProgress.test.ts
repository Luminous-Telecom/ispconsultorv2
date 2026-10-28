import {
  asymptoticProgress,
  phaseRanges,
  progressWithin,
  redactBackupLogLine,
  tableNameFromDumpLine,
} from './backupProgress';

describe('progresso do backup', () => {
  it('posiciona o percentual dentro da faixa', () => {
    expect(progressWithin(8, 92, 0)).toBe(8);
    expect(progressWithin(8, 92, 0.5)).toBe(50);
    expect(progressWithin(8, 92, 1)).toBe(92);
  });

  it('não chega ao fim da faixa enquanto o processo ainda emite linhas', () => {
    const value = asymptoticProgress(8, 92, 3);
    expect(value).toBeGreaterThan(8);
    expect(value).toBeLessThan(92);
  });

  it('esconde senha e linha vazia', () => {
    expect(redactBackupLogLine('  ', [])).toBeNull();
    expect(redactBackupLogLine('Access denied for user using secret-db-pass', ['secret-db-pass'])).toBeNull();
    expect(redactBackupLogLine('Using a password on the command line', [])).toBeNull();
    expect(redactBackupLogLine('-- Retrieving table structure for table `clientes`', [])).toContain('clientes');
  });

  it('lê o nome da tabela no log do dump', () => {
    expect(tableNameFromDumpLine("-- Retrieving table structure for table `clientes`...")).toBe('clientes');
    expect(tableNameFromDumpLine('compactando arquivos')).toBeNull();
  });

  it('reserva a maior parte do completo para banco e arquivos', () => {
    const ranges = phaseRanges('completo');
    expect(ranges.database[0]).toBeLessThan(ranges.arquivos[0]);
    expect(ranges.arquivos[1]).toBeLessThanOrEqual(ranges.logs[0]);
    expect(ranges.pack[1]).toBeLessThan(100);
  });
});