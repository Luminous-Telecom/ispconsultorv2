import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { createWriteStream, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';

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

  static async executeManual(tipo: 'database' | 'arquivos' | 'logs' | 'completo'): Promise<{ success: boolean; message: string }> {
    logger.info('Backup manual solicitado', { tipo });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = getBackupDir();
    await fs.mkdir(dir, { recursive: true });

    const run = async (cmd: string, args: string[], opts?: { env?: NodeJS.ProcessEnv }): Promise<void> => {
      return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { env: { ...process.env, ...opts?.env } });
        let stderr = '';
        proc.stderr?.on('data', (d) => { stderr += d.toString(); });
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `Processo encerrou com código ${code}`));
        });
        proc.on('error', reject);
      });
    };

    const doBackupDatabase = async (outDir: string): Promise<void> => {
      const outFile = path.join(outDir, 'dump.sql');
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '3306';
      const db = process.env.DB_NAME || 'ispconsultor';
      const user = process.env.DB_USER || '';
      const pass = process.env.DB_PASSWORD || '';
      const cmds = process.platform === 'win32' ? ['mysqldump.exe', 'mariadb-dump.exe'] : ['mysqldump', 'mariadb-dump'];
      const args = ['-h', host, '-P', port, '-u', user, `-p${pass}`, db];
      let lastErr: Error | null = null;
      for (const cmd of cmds) {
        try {
          const writeStream = createWriteStream(outFile);
          const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
          proc.stdout?.pipe(writeStream);
          await new Promise<void>((resolve, reject) => {
            proc.on('close', (code) => {
              writeStream.end();
              if (code === 0) resolve();
              else reject(new Error(`Backup do banco encerrou com código ${code}`));
            });
            proc.on('error', (e) => reject(e));
          });
          logger.info('Backup do banco concluído', { arquivo: path.basename(outFile) });
          return;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
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
      await run('tar', ['-czf', outFile, '-C', parent, '--exclude', `${folderName}/backups`, folderName]);
      logger.info('Backup de arquivos concluído', { arquivo: path.basename(outFile) });
    };

    const doBackupLogs = async (outDir: string): Promise<void> => {
      const outFile = path.join(outDir, 'logs-operacionais.txt');
      await fs.writeFile(
        outFile,
        `Backup de logs operacionais em ${new Date().toISOString()}\n` +
          'Os logs (auditoria, rotinas, SSH) estão nas tabelas MySQL incluídas no dump MariaDB.\n'
      );
      logger.info('Informação de logs operacionais gravada no backup');
    };

    try {
      if (tipo === 'completo') {
        const tempDir = path.join(os.tmpdir(), `backup_completo_${timestamp}`);
        await fs.mkdir(tempDir, { recursive: true });
        try {
          await doBackupDatabase(tempDir);
          await doBackupArquivos(tempDir);
          await doBackupLogs(tempDir);
          const outFile = path.join(dir, `BKP_completo_${timestamp}.tar.gz`);
          const entries = await fs.readdir(tempDir);
          await run('tar', ['-czf', outFile, '-C', tempDir, ...entries]);
          logger.info('Backup completo concluído', { arquivo: path.basename(outFile) });
        } finally {
          await fs.rm(tempDir, { recursive: true, force: true });
        }
      } else {
        if (tipo === 'database') {
          await doBackupDatabase(dir);
          const outFile = path.join(dir, `BKP_mariadb_${timestamp}.sql`);
          await fs.rename(path.join(dir, 'dump.sql'), outFile);
        }
        if (tipo === 'arquivos') {
          const outFile = path.join(dir, `BKP_arquivos_${timestamp}.tar.gz`);
          await doBackupArquivos(dir);
          await fs.rename(path.join(dir, 'arquivos.tar.gz'), outFile);
        }
        if (tipo === 'logs') {
          await doBackupLogs(dir);
          const txtPath = path.join(dir, 'logs-operacionais.txt');
          await fs.rename(txtPath, path.join(dir, `BKP_logs_operacionais_${timestamp}.txt`));
        }
      }

      return {
        success: true,
        message: `Backup manual (${tipo}) concluído com sucesso.`
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao executar backup';
      logger.error('Erro no backup manual', { tipo, erro: msg });
      return {
        success: false,
        message: `Falha no backup: ${msg}`
      };
    }
  }
}
