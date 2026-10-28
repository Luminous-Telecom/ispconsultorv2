import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';
import {
  asymptoticProgress,
  BackupManualTipo,
  BackupProgressEvent,
  phaseRanges,
  progressWithin,
  redactBackupLogLine,
  tableNameFromDumpLine,
} from './backupProgress';

export type { BackupProgressEvent } from './backupProgress';

export interface BackupItem {
  nome: string;
  nomeCompleto: string;
  tamanho: number;
  tamanhoFormatado: string;
  data: Date;
  dataFormatada: string;
  tipo: string;
}

const BACKUP_DIR = 'backups';

function getBackupDir(): string {
  return resolveArquivosPath(BACKUP_DIR);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function spawnLogged(
  cmd: string,
  args: string[],
  options: {
    stdoutFile?: string;
    secrets: string[];
    onLine?: (line: string) => void;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const writeStream = options.stdoutFile ? createWriteStream(options.stdoutFile) : null;
    if (writeStream && proc.stdout) proc.stdout.pipe(writeStream);

    let stderrTail = '';
    const flushes: Array<() => void> = [];
    const attach = (stream: NodeJS.ReadableStream | null | undefined, keepTail: boolean) => {
      if (!stream) return;
      let carry = '';
      stream.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        if (keepTail) stderrTail = (stderrTail + text).slice(-800);
        carry += text;
        const parts = carry.split(/\r?\n/);
        carry = parts.pop() ?? '';
        for (const part of parts) {
          const clean = redactBackupLogLine(part, options.secrets);
          if (clean) options.onLine?.(clean);
        }
      });
      flushes.push(() => {
        const rest = redactBackupLogLine(carry, options.secrets);
        if (rest) options.onLine?.(rest);
        carry = '';
      });
    };
    attach(proc.stderr, true);
    if (!writeStream) attach(proc.stdout, false);

    let settled = false;
    const finish = (code: number | null) => {
      if (settled) return;
      settled = true;
      for (const flush of flushes) flush();
      if (code === 0) {
        resolve();
        return;
      }
      const detail = redactBackupLogLine(stderrTail, options.secrets);
      reject(new Error(detail || `Processo encerrou com código ${code}`));
    };

    let stdoutDone = !writeStream;
    let exitSeen = false;
    let exitCode: number | null = null;
    const tryFinish = () => {
      if (!exitSeen || !stdoutDone) return;
      finish(exitCode);
    };

    if (writeStream) {
      writeStream.on('finish', () => {
        stdoutDone = true;
        tryFinish();
      });
      writeStream.on('error', (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      });
    }

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      writeStream?.destroy();
      reject(err);
    });
    proc.on('close', (code) => {
      exitSeen = true;
      exitCode = code;
      tryFinish();
    });
  });
}

function captureStdout(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`Processo encerrou com código ${code}`));
    });
  });
}

async function countDatabaseTables(secrets: string[]): Promise<number | null> {
  const db = process.env.DB_NAME || '';
  if (!/^[A-Za-z0-9_]+$/.test(db)) return null;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || '';
  const pass = process.env.DB_PASSWORD || '';
  const cmds = process.platform === 'win32' ? ['mysql.exe', 'mariadb.exe'] : ['mysql', 'mariadb'];
  const args = ['-N', '-B', '-h', host, '-P', port, '-u', user, `-p${pass}`, '-e', `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${db}'`];
  for (const cmd of cmds) {
    try {
      const out = await captureStdout(cmd, args);
      const total = Number.parseInt(redactBackupLogLine(out, secrets) ?? '', 10);
      if (Number.isFinite(total) && total > 0) return total;
    } catch {
      continue;
    }
  }
  return null;
}

function inferTipo(nome: string): string {
  const lower = nome.toLowerCase();
  if (lower.includes('completo')) return 'Completo';
  if (lower.includes('mariadb') || lower.includes('database') || lower.includes('bd') || lower.endsWith('.sql')) return 'MariaDB';
  if (lower.includes('elastic') || lower.includes('elasticsearch') || lower.endsWith('.ndjson')) return 'Logs (legado)';
  if (lower.includes('config') || lower.includes('configuracoes')) return 'Configurações';
  if (lower.includes('log')) return 'Logs';
  return 'Arquivos';
}

export class BackupService {
  static async list(): Promise<BackupItem[]> {
    const dir = getBackupDir();
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // já existe
    }
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items: BackupItem[] = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const fullPath = path.join(dir, ent.name);
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }
      items.push({
        nome: ent.name,
        nomeCompleto: fullPath,
        tamanho: stat.size,
        tamanhoFormatado: formatBytes(stat.size),
        data: stat.mtime,
        dataFormatada: stat.mtime.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        tipo: inferTipo(ent.name)
      });
    }
    items.sort((a, b) => b.data.getTime() - a.data.getTime());
    return items;
  }

  static async delete(nomeArquivo: string): Promise<void> {
    const dir = getBackupDir();
    const base = path.basename(nomeArquivo);
    if (base !== nomeArquivo || base.includes('..')) {
      throw new Error('Nome de arquivo inválido');
    }
    const fullPath = path.join(dir, base);
    try {
      await fs.unlink(fullPath);
      logger.info('Backup removido', { arquivo: base });
    } catch (err) {
      logger.error('Erro ao remover backup', { arquivo: base, err });
      throw err;
    }
  }

  static async getFilePath(nomeArquivo: string): Promise<string> {
    const dir = getBackupDir();
    const base = path.basename(nomeArquivo);
    if (base !== nomeArquivo || base.includes('..')) {
      throw new Error('Nome de arquivo inválido');
    }
    const fullPath = path.join(dir, base);
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error('Arquivo de backup não encontrado');
    }
    return fullPath;
  }

  static async restore(nomeArquivo: string): Promise<{ success: boolean; message: string }> {
    const fullPath = await this.getFilePath(nomeArquivo);
    const lower = nomeArquivo.toLowerCase();
    logger.info('Restauração de backup iniciada', { arquivo: nomeArquivo, path: fullPath });

    const run = (cmd: string, args: string[], opts?: { stdin?: NodeJS.ReadableStream }): Promise<void> => {
      return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { stdio: opts?.stdin ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        proc.stderr?.on('data', (d) => { stderr += d.toString(); });
        if (opts?.stdin) opts.stdin.pipe(proc.stdin!);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `Processo encerrou com código ${code}`));
        });
        proc.on('error', reject);
      });
    };

    try {
      if (lower.includes('completo')) {
        const tempDir = path.join(os.tmpdir(), `restore_completo_${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });
        try {
          await run('tar', ['-xzf', fullPath, '-C', tempDir]);
          const dumpPath = path.join(tempDir, 'dump.sql');
          const arquivosPath = path.join(tempDir, 'arquivos.tar.gz');
          const host = process.env.DB_HOST || 'localhost';
          const port = process.env.DB_PORT || '3306';
          const db = process.env.DB_NAME || 'ispconsultor';
          const user = process.env.DB_USER || '';
          const pass = process.env.DB_PASSWORD || '';
          const cmds = process.platform === 'win32' ? ['mysql.exe', 'mariadb.exe'] : ['mysql', 'mariadb'];
          const args = ['-h', host, '-P', port, '-u', user, `-p${pass}`, db];

          if (await fs.access(dumpPath).then(() => true).catch(() => false)) {
            const readStream = createReadStream(dumpPath);
            let lastErr: Error | null = null;
            for (const cmd of cmds) {
              try {
                await run(cmd, args, { stdin: readStream });
                logger.info('Restauração MariaDB do backup completo concluída');
                lastErr = null;
                break;
              } catch (e) {
                lastErr = e instanceof Error ? e : new Error(String(e));
                continue;
              }
            }
            if (lastErr) throw lastErr;
          }

          if (await fs.access(arquivosPath).then(() => true).catch(() => false)) {
            const arquivosBase = resolveArquivosPath();
            const parent = path.dirname(arquivosBase);
            await run('tar', ['-xzf', arquivosPath, '-C', parent]);
            logger.info('Restauração de arquivos do backup completo concluída');
          }

          cache.clear();
          logger.info('Cache de memória limpo após restore completo');
          return { success: true, message: 'Backup completo restaurado com sucesso.' };
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      }

      if (lower.includes('mariadb') || lower.endsWith('.sql')) {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '3306';
        const db = process.env.DB_NAME || 'ispconsultor';
        const user = process.env.DB_USER || '';
        const pass = process.env.DB_PASSWORD || '';
        const cmds = process.platform === 'win32' ? ['mysql.exe', 'mariadb.exe'] : ['mysql', 'mariadb'];
        const args = ['-h', host, '-P', port, '-u', user, `-p${pass}`, db];
        let lastErr: Error | null = null;
        for (const cmd of cmds) {
          try {
            const readStream = createReadStream(fullPath);
            await run(cmd, args, { stdin: readStream });
            logger.info('Restauração MariaDB concluída', { arquivo: nomeArquivo });
            cache.clear();
            logger.info('Cache de memória limpo após restore MariaDB');
            return { success: true, message: 'Banco de dados restaurado com sucesso.' };
          } catch (e) {
            lastErr = e instanceof Error ? e : new Error(String(e));
            continue;
          }
        }
        if (lastErr) throw lastErr;
      }

      if (lower.includes('arquivos') || lower.endsWith('.tar.gz')) {
        const arquivosBase = resolveArquivosPath();
        const parent = path.dirname(arquivosBase);
        await run('tar', ['-xzf', fullPath, '-C', parent]);
        logger.info('Restauração de arquivos concluída', { arquivo: nomeArquivo });
        return { success: true, message: 'Arquivos restaurados com sucesso.' };
      }

      if (lower.includes('elasticsearch') || lower.endsWith('.ndjson')) {
        return {
          success: false,
          message: 'Backups Elasticsearch não são mais suportados. Os logs operacionais estão no backup MariaDB.',
        };
      }

      return {
        success: false,
        message: `Tipo de backup não suportado para restauração: ${nomeArquivo}`
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao restaurar';
      logger.error('Erro na restauração', { arquivo: nomeArquivo, erro: msg });
      return { success: false, message: `Falha na restauração: ${msg}` };
    }
  }

  static async executeManual(
    tipo: BackupManualTipo,
    onProgress?: (event: BackupProgressEvent) => void
  ): Promise<{ success: boolean; message: string }> {
    logger.info('Backup manual solicitado', { tipo });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = getBackupDir();
    await fs.mkdir(dir, { recursive: true });
    const ranges = phaseRanges(tipo);
    const pass = process.env.DB_PASSWORD || '';
    const secrets = pass ? [pass] : [];
    const emit = (step: string, progress: number, message: string, log?: string) => {
      onProgress?.({
        step,
        progress,
        message,
        logs: log ? [log] : undefined,
      });
    };

    const doBackupDatabase = async (outDir: string): Promise<void> => {
      const outFile = path.join(outDir, 'dump.sql');
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '3306';
      const db = process.env.DB_NAME || 'ispconsultor';
      const user = process.env.DB_USER || '';
      const cmds = process.platform === 'win32' ? ['mysqldump.exe', 'mariadb-dump.exe'] : ['mysqldump', 'mariadb-dump'];
      const args = ['--verbose', '-h', host, '-P', port, '-u', user, `-p${pass}`, db];
      const [start, end] = ranges.database;
      const totalTables = await countDatabaseTables(secrets);
      emit('database', start, 'Exportando banco de dados', totalTables
        ? `Exportando banco de dados (${totalTables} tabelas)`
        : 'Exportando banco de dados');
      const seen = new Set<string>();
      let lines = 0;
      let lastErr: Error | null = null;
      for (const cmd of cmds) {
        try {
          await spawnLogged(cmd, args, {
            stdoutFile: outFile,
            secrets,
            onLine: (line) => {
              lines += 1;
              const table = tableNameFromDumpLine(line);
              if (table && /structure/i.test(line)) seen.add(table);
              const progress = totalTables
                ? progressWithin(start, end - 1, seen.size / totalTables)
                : asymptoticProgress(start, end, lines);
              const label = table ? `Exportando tabela ${table}` : 'Exportando banco de dados';
              emit('database', progress, label, line.replace(/^--\s*/, ''));
            },
          });
          emit('database', end, 'Banco de dados exportado', 'Banco de dados exportado');
          logger.info('Backup do banco concluído', { arquivo: path.basename(outFile) });
          return;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
          emit('database', start, `Falha ao usar ${cmd}`, `Tentativa com ${cmd} não concluiu`);
          continue;
        }
      }
      if (lastErr) throw lastErr;
    };

    const doBackupArquivos = async (outDir: string): Promise<void> => {
      const outFile = path.join(outDir, 'arquivos.tar.gz');
      const arquivosBase = resolveArquivosPath();
      const parent = path.dirname(arquivosBase);
      const folderName = path.basename(arquivosBase);
      const [start, end] = ranges.arquivos;
      emit('arquivos', start, 'Compactando arquivos', 'Compactando arquivos da instalação');
      let files = 0;
      await spawnLogged('tar', ['-czvf', outFile, '-C', parent, '--exclude', `${folderName}/backups`, folderName], {
        secrets,
        onLine: (line) => {
          files += 1;
          if (files !== 1 && files % 25 !== 0) return;
          const progress = asymptoticProgress(start, end, Math.ceil(files / 25));
          emit('arquivos', progress, 'Compactando arquivos', line);
        },
      });
      emit('arquivos', end, 'Arquivos compactados', 'Arquivos compactados');
      logger.info('Backup de arquivos concluído', { arquivo: path.basename(outFile) });
    };

    const doBackupLogs = async (outDir: string): Promise<void> => {
      const outFile = path.join(outDir, 'logs-operacionais.txt');
      const [start] = ranges.logs;
      emit('logs', start, 'Registrando logs operacionais', 'Os logs operacionais estão no banco e entram no backup');
      await fs.writeFile(
        outFile,
        `Backup de logs operacionais em ${new Date().toISOString()}\n` +
          'Os logs (auditoria, rotinas, SSH) estão nas tabelas MySQL incluídas no dump MariaDB.\n'
      );
      emit('logs', ranges.logs[1], 'Logs operacionais registrados', 'Nota de logs operacionais gravada');
      logger.info('Informação de logs operacionais gravada no backup');
    };

    try {
      let finalPath = '';
      if (tipo === 'completo') {
        const tempDir = path.join(os.tmpdir(), `backup_completo_${timestamp}`);
        await fs.mkdir(tempDir, { recursive: true });
        try {
          await doBackupDatabase(tempDir);
          await doBackupArquivos(tempDir);
          await doBackupLogs(tempDir);
          const outFile = path.join(dir, `BKP_completo_${timestamp}.tar.gz`);
          const entries = await fs.readdir(tempDir);
          emit('pack', ranges.pack[0], 'Empacotando backup completo', 'Empacotando banco, arquivos e logs');
          await spawnLogged('tar', ['-czf', outFile, '-C', tempDir, ...entries], { secrets });
          finalPath = outFile;
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      } else if (tipo === 'database') {
        await doBackupDatabase(dir);
        finalPath = path.join(dir, `BKP_mariadb_${timestamp}.sql`);
        await fs.rename(path.join(dir, 'dump.sql'), finalPath);
      } else if (tipo === 'arquivos') {
        await doBackupArquivos(dir);
        finalPath = path.join(dir, `BKP_arquivos_${timestamp}.tar.gz`);
        await fs.rename(path.join(dir, 'arquivos.tar.gz'), finalPath);
      } else {
        await doBackupLogs(dir);
        finalPath = path.join(dir, `BKP_logs_operacionais_${timestamp}.txt`);
        await fs.rename(path.join(dir, 'logs-operacionais.txt'), finalPath);
      }

      const stat = await fs.stat(finalPath);
      const label = `${path.basename(finalPath)} (${formatBytes(stat.size)})`;
      const message = `Backup concluído: ${label}`;
      logger.info('Backup manual concluído', { arquivo: path.basename(finalPath), tamanho: stat.size });
      onProgress?.({
        step: 'finalizado',
        progress: 100,
        message,
        logs: [`✓ ${label}`],
        success: true,
      });
      return { success: true, message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar backup';
      logger.error('Erro no backup manual', { tipo, erro: msg });
      const message = `Falha no backup: ${msg}`;
      onProgress?.({ step: 'erro', progress: 0, message, logs: [`✗ ${msg}`], error: msg });
      return { success: false, message };
    }
  }
}
