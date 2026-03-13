import { Request, Response } from 'express';
import fs from 'fs';
import { BackupService } from '../../../services/sistema/BackupService';
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
      logger.info('Backup download: iniciando stream', { nome, fullPath });
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nome)}"`);
      const stream = fs.createReadStream(fullPath);
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
