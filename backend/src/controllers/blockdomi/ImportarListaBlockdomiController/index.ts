import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ImportarListaBlockdomiService } from '../../../services/blockdomi/ImportarListaBlockdomiService';
import { VersaoBlockdomiService } from '../../../services/blockdomi/VersaoBlockdomiService';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { logger } from '../../../utils/logger';
import { Dominio } from '../../../models/blockdomi/Dominio';
import { IPv4 } from '../../../models/blockdomi/IPv4';
import { IPv6 } from '../../../models/blockdomi/IPv6';

export class ImportarListaBlockdomiController {
  static async importar(req: Request, res: Response): Promise<void> {
    try {
      const {
        dominios = [],
        ipv4 = [],
        ipv6 = [],
        nome_oficio,
        data_inicio_bloqueio,
        data_fim_bloqueio,
        link_oficio_anatel,
        link_oficio_justica,
        link_planilha_dominios
      } = req.body;

      const dominiosArr = Array.isArray(dominios) ? dominios : [];
      const ipv4Arr = Array.isArray(ipv4) ? ipv4 : [];
      const ipv6Arr = Array.isArray(ipv6) ? ipv6 : [];

      const total = dominiosArr.length + ipv4Arr.length + ipv6Arr.length;
      if (total === 0) {
        sendValidationError(res, 'Informe ao menos um item em dominios, ipv4 ou ipv6.');
        return;
      }

      const dataInicio = data_inicio_bloqueio != null ? String(data_inicio_bloqueio).trim() : '';
      if (!dataInicio) {
        sendValidationError(res, 'Data início bloqueio é obrigatória no importe em lote.');
        return;
      }

      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const result = await ImportarListaBlockdomiService.importar({
        dominios: dominiosArr,
        ipv4: ipv4Arr,
        ipv6: ipv6Arr,
        nome_oficio: nome_oficio ?? null,
        data_inicio_bloqueio: data_inicio_bloqueio ?? null,
        data_fim_bloqueio: data_fim_bloqueio ?? null,
        link_oficio_anatel: link_oficio_anatel ?? null,
        link_oficio_justica: link_oficio_justica ?? null,
        link_planilha_dominios: link_planilha_dominios ?? null,
        empresa_id: empresaIdAudit
      });

      try {
        const totalAlterados = result.dominios.created + result.dominios.updated + result.ipv4.created + result.ipv4.updated + result.ipv6.created + result.ipv6.updated;
        if (totalAlterados > 0) {
          const obs = `Importação lista v${result.versao_lista}`;
          const allDomIds = [...result.dominios.createdIds, ...result.dominios.updatedIds];
          if (allDomIds.length > 0) {
            const dominios = await Dominio.findAll({ where: { id: { [Op.in]: allDomIds } } });
            const domMap = new Map(dominios.map((d) => [d.id, d.toJSON() as Record<string, unknown>]));
            for (const id of result.dominios.createdIds) {
              const dados = domMap.get(id);
              if (dados) await registrarCriacao(req, 'Dominio', id, dados, obs, empresaIdAudit);
            }
            for (const id of result.dominios.updatedIds) {
              const dados = domMap.get(id);
              if (dados) await registrarAtualizacao(req, 'Dominio', id, { id }, dados, obs, empresaIdAudit);
            }
          }
          const allIpv4Ids = [...result.ipv4.createdIds, ...result.ipv4.updatedIds];
          if (allIpv4Ids.length > 0) {
            const ipv4s = await IPv4.findAll({ where: { id: { [Op.in]: allIpv4Ids } } });
            const ipv4Map = new Map(ipv4s.map((d) => [d.id, d.toJSON() as Record<string, unknown>]));
            for (const id of result.ipv4.createdIds) {
              const dados = ipv4Map.get(id);
              if (dados) await registrarCriacao(req, 'IPv4', id, dados, obs, empresaIdAudit);
            }
            for (const id of result.ipv4.updatedIds) {
              const dados = ipv4Map.get(id);
              if (dados) await registrarAtualizacao(req, 'IPv4', id, { id }, dados, obs, empresaIdAudit);
            }
          }
          const allIpv6Ids = [...result.ipv6.createdIds, ...result.ipv6.updatedIds];
          if (allIpv6Ids.length > 0) {
            const ipv6s = await IPv6.findAll({ where: { id: { [Op.in]: allIpv6Ids } } });
            const ipv6Map = new Map(ipv6s.map((d) => [d.id, d.toJSON() as Record<string, unknown>]));
            for (const id of result.ipv6.createdIds) {
              const dados = ipv6Map.get(id);
              if (dados) await registrarCriacao(req, 'IPv6', id, dados, obs, empresaIdAudit);
            }
            for (const id of result.ipv6.updatedIds) {
              const dados = ipv6Map.get(id);
              if (dados) await registrarAtualizacao(req, 'IPv6', id, { id }, dados, obs, empresaIdAudit);
            }
          }
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }

      const parts = [`Lista versão ${result.versao_lista}`];
      if (result.dominios.created + result.dominios.updated > 0) {
        parts.push(`Domínios: ${result.dominios.created} criado(s), ${result.dominios.updated} atualizado(s)`);
      }
      if (result.ipv4.created + result.ipv4.updated > 0) {
        parts.push(`IPv4: ${result.ipv4.created} criado(s), ${result.ipv4.updated} atualizado(s)`);
      }
      if (result.ipv6.created + result.ipv6.updated > 0) {
        parts.push(`IPv6: ${result.ipv6.created} criado(s), ${result.ipv6.updated} atualizado(s)`);
      }

      sendSuccess(res, result, parts.join('. ') + '.', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao importar lista blockdomi', 500, true, {
        context: 'ImportarListaBlockdomiController',
        action: 'importar',
        body: req.body
      });
    }
  }

  /**
   * Upload de PDF de ofício para uso nos links (Anatel, Justiça, Planilha).
   * Retorna URL para ser salva no metadata.
   */
  static async uploadOficioPdf(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        sendValidationError(res, 'Arquivo PDF não enviado');
        return;
      }
      const allowedMimes = ['application/pdf'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        if (req.file.path) {
          try {
            const fs = await import('fs');
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          } catch {}
        }
        sendValidationError(res, 'Apenas arquivos PDF são permitidos');
        return;
      }
      const filePath = `/arquivos/blockdomi/${req.file.filename}`;
      const baseUrl = req.get('host') ? `${req.protocol}://${req.get('host')}` : '';
      const fullUrl = `${baseUrl}${filePath}`;
      logger.info('Upload PDF ofício blockdomi concluído', {
        filename: req.file.filename,
        originalname: req.file.originalname
      });
      sendSuccess(res, { url: fullUrl, path: filePath });
    } catch (error) {
      sendError(res, error, 'Erro ao fazer upload do PDF', 500, true, {
        context: 'ImportarListaBlockdomiController',
        action: 'uploadOficioPdf'
      });
    }
  }

  /**
   * Gera uma nova versão sem vincular a nenhuma entidade.
   * Não altera versões existentes.
   */
  static async gerarVersao(req: Request, res: Response): Promise<void> {
    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const versao = await VersaoBlockdomiService.criarVersao(undefined, empresaIdAudit);
      try {
        await registrarCriacao(
          req,
          'VersaoBlockdomi',
          versao.id,
          { id: versao.id, numero: versao.numero },
          `Versão ${versao.numero} gerada`,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(res, versao, `Versão ${versao.numero} gerada.`, 201);
    } catch (error) {
      sendError(res, error, 'Erro ao gerar versão', 500, true, {
        context: 'ImportarListaBlockdomiController',
        action: 'gerarVersao'
      });
    }
  }
}
