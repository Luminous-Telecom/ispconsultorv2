import { Request, Response } from 'express';
import fs from 'fs';
import { BackupProgressEvent, BackupService } from '../../../services/sistema/BackupService';
import { registrarCriacao, registrarExclusao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class BackupController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const items = await BackupService.list();
      sendSuccess(res, items);
    } catch (error) {
      sendError(res, error, 'Erro ao listar backups', 500, true, {
        context: 'BackupController',
        action: 'list'
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { nome } = req.params;
      if (!nome) {
        res.status(400).json({ success: false, message: 'Nome do arquivo é obrigatório' });
        return;
      }
      await BackupService.delete(nome);
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req);
        await registrarExclusao(req as any, 'Backup', 0, { nome }, 'Backup removido', empresaIdAudit);
      } catch { /* não crítico */ }
      sendSuccess(res, undefined, 'Backup removido com sucesso');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao remover backup';
      if (msg.includes('não encontrado') || (error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      sendError(res, error, 'Erro ao remover backup', 500, true, {
        context: 'BackupController',
        action: 'delete',
        nome: req.params.nome
      });
    }
  }

  static async download(req: Request, res: Response): Promise<void> {
    try {
      const { nome } = req.params;
      if (!nome) {
        res.status(400).json({ success: false, message: 'Nome do arquivo é obrigatório' });
        return;
      }
      const fullPath = await BackupService.getFilePath(nome);
      if (!fs.existsSync(fullPath)) {
        logger.info('Backup download: arquivo não encontrado', { nome, fullPath });
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      const stat = await fs.promises.stat(fullPath);
      const safeName = nome.replace(/["\\\r\n]/g, '_');
      logger.info('Backup download: iniciando stream', { nome, fullPath, tamanho: stat.size });
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      const stream = fs.createReadStream(fullPath);
      stream.on('error', (streamError) => {
        logger.error('Backup download: falha no stream', {
          nome,
          error: streamError instanceof Error ? streamError.message : 'Erro desconhecido',
        });
        if (!res.headersSent) {
          sendError(res, streamError, 'Erro ao fazer download do backup', 500, false, {
            context: 'BackupController',
            action: 'download',
            nome,
          });
          return;
        }
        res.destroy();
      });
      stream.pipe(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('não encontrado')) {
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      sendError(res, error, 'Erro ao fazer download do backup', 500, true, {
        context: 'BackupController',
        action: 'download',
        nome: req.params.nome
      });
    }
  }

  static async restore(req: Request, res: Response): Promise<void> {
    try {
      const { nome } = req.params;
      if (!nome) {
        res.status(400).json({ success: false, message: 'Nome do arquivo é obrigatório' });
        return;
      }
      const result = await BackupService.restore(nome);
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req);
        await registrarAtualizacao(req as any, 'Backup', 0, { nome }, { nome, restaurado: true }, 'Restore de backup', empresaIdAudit);
      } catch { /* não crítico */ }
      sendSuccess(res, result, result.message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('não encontrado')) {
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      sendError(res, error, 'Erro ao restaurar backup', 500, true, {
        context: 'BackupController',
        action: 'restore',
        nome: req.params.nome
      });
    }
  }

  static async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado' });
        return;
      }
      const nome = req.file.filename;
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req);
        await registrarCriacao(req as any, 'Backup', 0, { nome, tamanho: req.file.size }, 'Upload de backup', empresaIdAudit);
      } catch { /* não crítico */ }
      logger.info('Backup importado via upload', { arquivo: nome, tamanho: req.file.size });
      sendSuccess(res, { nome }, 'Backup importado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao importar backup', 500, true, {
        context: 'BackupController',
        action: 'upload'
      });
    }
  }

  static async executeManualStream(req: Request, res: Response): Promise<void> {
    const tipo = req.body?.tipo as 'database' | 'arquivos' | 'logs' | 'completo';
    const allowed = ['database', 'arquivos', 'logs', 'completo'];
    if (!tipo || !allowed.includes(tipo)) {
      res.status(400).json({
        success: false,
        message: 'Tipo inválido. Use: database, arquivos, logs ou completo',
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write(': connected\n\n');

    let closed = false;
    res.on('close', () => {
      closed = true;
    });
    const send = (event: BackupProgressEvent) => {
      if (closed) return;
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        closed = true;
      }
    };

    try {
      send({
        step: 'inicio',
        progress: 1,
        message: 'Iniciando backup...',
        logs: ['Iniciando backup...'],
      });
      const result = await BackupService.executeManual(tipo, send);
      if (result.success) {
        try {
          const empresaIdAudit = getEmpresaIdOrNull(req);
          await registrarCriacao(req, 'Backup', 0, { tipo, message: result.message }, 'Backup manual executado', empresaIdAudit);
        } catch { /* não crítico */ }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao executar backup manual';
      send({ step: 'erro', progress: 0, message: msg, logs: [`✗ ${msg}`], error: msg });
      logger.error('Erro no stream de backup manual', { tipo, erro: msg });
    } finally {
      try {
        if (!res.writableEnded) res.end();
      } catch {
        /* cliente encerrou a conexão */
      }
    }
  }

  static async executeManual(req: Request, res: Response): Promise<void> {
    try {
      const tipo = req.body?.tipo as 'database' | 'arquivos' | 'logs' | 'completo';
      const allowed = ['database', 'arquivos', 'logs', 'completo'];
      if (!tipo || !allowed.includes(tipo)) {
        res.status(400).json({
          success: false,
          message: 'Tipo inválido. Use: database, arquivos, logs ou completo'
        });
        return;
      }
      const result = await BackupService.executeManual(tipo);
      if (!result.success) {
        res.status(500).json({ success: false, message: result.message });
        return;
      }
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req);
        await registrarCriacao(req as any, 'Backup', 0, { tipo, message: result.message }, 'Backup manual executado', empresaIdAudit);
      } catch { /* não crítico */ }
      sendSuccess(res, result, result.message);
    } catch (error) {
      sendError(res, error, 'Erro ao executar backup manual', 500, true, {
        context: 'BackupController',
        action: 'executeManual'
      });
    }
  }
}
