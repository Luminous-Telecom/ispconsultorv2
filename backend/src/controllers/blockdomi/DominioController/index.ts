import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { prisma } from '../../../db/prisma';
import { DominioService, type SincronizarSeiAnatelDominiosRow } from '../../../services/blockdomi/DominioService';
import { iniciarBaixarPdfs, obterStatusBaixarPdfs, textoOcorrenciasAuditoria } from '../../../services/blockdomi/BaixarPdfsBlockdomiService';
import { emitBlockdomiPdfs } from '../../../socket/socketServer';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { registrarAuditoria } from '../../../services/sistema/AuditoriaRegistroService';
import { setAuditData } from '../../../middleware/auditMiddleware';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { sanitizeDominio } from '../../../utils/sanitize';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { BlockdomiLogAcessoService } from '../../../services/blockdomi/BlockdomiLogAcessoService';
import { getClientIp } from '../../../utils/requestUtils';
import { parseListQuery } from '../../../utils/listQuery';

/** Linha de observação/log: Ofício · Serial · link (N dom.) — erro */
function formatObservacaoLinhaFalhaSei(f: SincronizarSeiAnatelDominiosRow): string {
  const chunks: string[] = [];
  const nome = f.nome_oficio?.trim();
  const serial = f.versao_numero?.trim();
  if (nome) chunks.push(`Ofício: ${nome}`);
  if (serial) chunks.push(`Serial: ${serial}`);
  chunks.push(f.link_oficio_anatel);
  return `${chunks.join(' · ')} (${f.quantidade_dominios} dom.) — ${f.erro ?? ''}`;
}

export class DominioController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, ativo, sortColumn, sortDirection } = parseListQuery(req.query);

      const result = await DominioService.list({
        page,
        limit,
        search,
        searchField,
        ativo,
        sortColumn,
        sortDirection,
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar domínios', 500, true, {
        context: 'DominioController',
        action: 'list',
        query: req.query
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dominio = await DominioService.getById(id);

      if (!dominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }

      sendSuccess(res, toPlain(dominio));
    } catch (error) {
      sendError(res, error, 'Erro ao buscar domínio', 500, true, {
        context: 'DominioController',
        action: 'getById',
        dominioId: req.params.id
      });
    }
  }

  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      const { items, nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, link_oficio_anatel, link_oficio_justica, link_planilha_dominios, numero_sei_anatel } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        sendValidationError(res, 'Informe a lista de domínios (items: string[]).');
        return;
      }
      const dataInicio = data_inicio_bloqueio != null ? String(data_inicio_bloqueio).trim() : '';
      if (!dataInicio) {
        sendValidationError(res, 'Data início bloqueio é obrigatória no importe em lote.');
        return;
      }

      const trimOrNull = (v: unknown): string | null => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      };

      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const result = await DominioService.bulkCreate(items, {
        nome_oficio: trimOrNull(nome_oficio),
        data_inicio_bloqueio: dataInicio,
        data_fim_bloqueio: trimOrNull(data_fim_bloqueio),
        link_oficio_anatel: trimOrNull(link_oficio_anatel),
        link_oficio_justica: trimOrNull(link_oficio_justica),
        link_planilha_dominios: trimOrNull(link_planilha_dominios),
        numero_sei_anatel: trimOrNull(numero_sei_anatel),
        empresa_id: empresaIdAudit
      });

      try {
        const allIds = [...result.createdIds, ...result.updatedIds];
        if (allIds.length > 0) {
          const dominios = await prisma.blockdomi_dominios.findMany({ where: { id: { in: allIds } } });
          const domMap = new Map(dominios.map((d) => [d.id, { ...d } as Record<string, unknown>]));
          for (const id of result.createdIds) {
            const dados = domMap.get(id);
            if (dados) await registrarCriacao(req, 'Dominio', id, dados, 'Importação em lote', empresaIdAudit);
          }
          for (const id of result.updatedIds) {
            const dados = domMap.get(id);
            if (dados) await registrarAtualizacao(req, 'Dominio', id, { id }, dados, 'Importação em lote', empresaIdAudit);
          }
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }

      const parts = [`Criados ${result.created} domínio(s)`];
      if (result.updated > 0) parts.push(`atualizados ${result.updated}`);
      if (result.skipped > 0) parts.push(`ignorados ${result.skipped} duplicado(s)`);
      sendSuccess(res, result, parts.join(', ') + '.', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar domínios em lote', 500, true, {
        context: 'DominioController',
        action: 'bulkCreate'
      });
    }
  }

  static async bulkUpdate(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as {
        ids?: unknown[];
        nome_oficio?: unknown;
        data_inicio_bloqueio?: unknown;
        data_fim_bloqueio?: unknown;
        link_oficio_anatel?: unknown;
        link_oficio_justica?: unknown;
        link_planilha_dominios?: unknown;
        numero_sei_anatel?: unknown;
        descricao?: unknown;
        ativo?: unknown;
      };

      const idsRaw = Array.isArray(body.ids) ? body.ids : [];
      const ids = idsRaw.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
      if (ids.length === 0) {
        sendValidationError(res, 'Informe os IDs dos domínios (ids: number[]).');
        return;
      }

      const trimOrNull = (v: unknown): string | null => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      };

      const dominiosAntes =
        ids.length > 0 ? await prisma.blockdomi_dominios.findMany({ where: { id: { in: ids } } }) : [];
      const antesMap = new Map(dominiosAntes.map((d) => [d.id, { ...d } as Record<string, unknown>]));

      const result = await DominioService.bulkUpdate(ids, {
        nome_oficio: trimOrNull(body.nome_oficio),
        data_inicio_bloqueio: trimOrNull(body.data_inicio_bloqueio),
        data_fim_bloqueio: trimOrNull(body.data_fim_bloqueio),
        link_oficio_anatel: trimOrNull(body.link_oficio_anatel),
        link_oficio_justica: trimOrNull(body.link_oficio_justica),
        link_planilha_dominios: trimOrNull(body.link_planilha_dominios),
        numero_sei_anatel: trimOrNull(body.numero_sei_anatel),
        descricao: trimOrNull(body.descricao),
        ativo: typeof body.ativo === 'boolean' ? body.ativo : undefined
      });

      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;

      try {
        const dominiosDepois = await prisma.blockdomi_dominios.findMany({ where: { id: { in: ids } } });
        const depoisMap = new Map(dominiosDepois.map((d) => [d.id, { ...d } as Record<string, unknown>]));
        for (const id of ids) {
          const dadosAnteriores = antesMap.get(id);
          const dadosNovos = depoisMap.get(id);
          if (dadosAnteriores && dadosNovos) {
            await registrarAtualizacao(
              req,
              'Dominio',
              id,
              dadosAnteriores,
              dadosNovos,
              'Edição em lote',
              empresaIdAudit
            );
          }
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, result, `${result.updated} domínio(s) atualizado(s).`, 200);
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar domínios em lote', 500, true, {
        context: 'DominioController',
        action: 'bulkUpdate',
        body: req.body
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { dominio } = req.body;
      
      if (!dominio) {
        sendValidationError(res, 'Domínio é obrigatório');
        return;
      }

      const dominioLimpo = sanitizeDominio(dominio);
      if (!dominioLimpo) {
        sendValidationError(res, 'Informe o domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Não use https:// ou http:// no início.');
        return;
      }

      const existente = await DominioService.findByDominio(dominioLimpo);
      if (existente) {
        sendValidationError(res, 'Já existe um domínio cadastrado com este valor.');
        return;
      }

      const dominioCriado = await DominioService.create({
        ...req.body,
        dominio: dominioLimpo,
        empresa_id: req.body.empresa_id ?? getEmpresaIdOrNull(req) ?? null
      });
      
      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? dominioCriado.empresa_id ?? null;
        await registrarCriacao(
          req,
          'Dominio',
          dominioCriado.id,
          toPlain(dominioCriado) as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, dominioCriado, 'Domínio criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar domínio', 500, true, {
        context: 'DominioController',
        action: 'create',
        body: req.body
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingDominio = await DominioService.getById(id);
      if (!existingDominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }
      
      const dadosAnteriores = toPlain(existingDominio) as Record<string, unknown>;
      
      const { dominio } = req.body;
      if (!dominio) {
        sendValidationError(res, 'Domínio é obrigatório');
        return;
      }

      const dominioLimpo = sanitizeDominio(dominio);
      if (!dominioLimpo) {
        sendValidationError(res, 'Informe o domínio sem protocolo (ex: meusite.com ou encurtador.com/abc123). Não use https:// ou http:// no início.');
        return;
      }

      const existente = await DominioService.findByDominio(dominioLimpo);
      if (existente && Number(existente.id) !== Number(id)) {
        sendValidationError(res, 'Já existe um domínio cadastrado com este valor.');
        return;
      }

      const dominioAtualizado = await DominioService.update(id, { ...req.body, dominio: dominioLimpo });
      
      // Registrar auditoria
      const dadosNovos = toPlain(dominioAtualizado) as Record<string, unknown>;
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? dominioAtualizado.empresa_id ?? null;
        await registrarAtualizacao(
          req,
          'Dominio',
          dominioAtualizado.id,
          dadosAnteriores,
          dadosNovos,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, dominioAtualizado, 'Domínio atualizado com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar domínio', 500, true, {
        context: 'DominioController',
        action: 'update',
        dominioId: req.params.id,
        body: req.body
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const dominio = await DominioService.getById(id);
      
      if (!dominio) {
        sendNotFound(res, 'Domínio não encontrado');
        return;
      }
      
      const dadosAnteriores = toPlain(dominio) as Record<string, unknown>;
      
      await DominioService.delete(id);
      
      // Registrar auditoria
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? dominio.empresa_id ?? null;
        await registrarExclusao(
          req,
          'Dominio',
          dominio.id,
          dadosAnteriores,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }
      
      sendSuccess(res, undefined, 'Domínio excluído com sucesso!');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar domínio', 500, true, {
        context: 'DominioController',
        action: 'delete',
        dominioId: req.params.id
      });
    }
  }

  static async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      if (ids.length === 0) {
        sendValidationError(res, 'Informe os IDs para exclusão (ids: number[]).');
        return;
      }

      const idsNum = ids.map((id: unknown) => Number(id)).filter((n: number) => !Number.isNaN(n));
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;

      const dominiosAntes = idsNum.length > 0 ? await prisma.blockdomi_dominios.findMany({ where: { id: { in: idsNum } } }) : [];
      const { deleted, versao } = await DominioService.bulkDelete(ids);

      try {
        for (const d of dominiosAntes) {
          await registrarExclusao(req, 'Dominio', d.id, { ...d } as Record<string, unknown>, 'Exclusão em lote', empresaIdAudit);
        }
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(
        res,
        { deleted, versao },
        `Excluído(s) ${deleted} domínio(s). Versão da operação: ${versao}.`,
        200
      );
    } catch (error) {
      sendError(res, error, 'Erro ao excluir domínios em massa', 500, true, {
        context: 'DominioController',
        action: 'bulkDelete',
        body: req.body
      });
    }
  }

  /**
   * Para cada link único de ofício Anatel, baixa o PDF uma vez, extrai o SEI e atualiza todos os domínios
   * da empresa que ainda não possuem número SEI e compartilham esse PDF.
   */
  static async sincronizarSeiAnatel(req: Request, res: Response): Promise<void> {
    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const publicBaseUrl = (
        process.env.BASE_URL ||
        process.env.APP_URL ||
        `${req.protocol}://${req.get('host') ?? ''}`
      ).replace(/\/$/, '');

      const result = await DominioService.sincronizarSeiAnatelPorPdfOficio({
        empresaId: empresaIdAudit,
        publicBaseUrl
      });

      try {
        for (const entry of result.auditoria) {
          await registrarAtualizacao(
            req,
            'Dominio',
            entry.id,
            entry.antes,
            entry.depois,
            'Sincronização SEI (ofício Anatel)',
            empresaIdAudit
          );
        }
      } catch {
        /* auditoria não deve interromper */
      }

      const falhasSei = result.resultados.filter((r) => r.erro);
      if (falhasSei.length > 0) {
        const linhas = falhasSei.map((f) => formatObservacaoLinhaFalhaSei(f));
        const mensagemErro = [`Sincronização SEI: ${falhasSei.length} PDF(s) sem SEI ou com erro.`, linhas.join('\n')].join(
          '\n'
        );
        void BlockdomiLogAcessoService.registrar({
          ip: getClientIp(req),
          rota: '/api/dominios/sincronizar-sei-anatel',
          metodo: 'POST',
          status_http: 200,
          sucesso: false,
          mensagem_erro: mensagemErro.slice(0, 32000),
          user_agent: (req.headers['user-agent'] as string | undefined) ?? null,
          ...(empresaIdAudit != null && empresaIdAudit > 0 ? { empresa_id: empresaIdAudit } : {}),
        });
        const obsFalha = `[Falha] ${mensagemErro}`;
        void registrarAuditoria(req, {
          acao: 'executar',
          entidade: 'Dominio',
          observacoes: obsFalha.slice(0, 32000),
          dados_novos: {
            sincronizacao_sei: {
              resultado: 'falha',
              pdfs_com_erro: falhasSei.length
            }
          },
          rota: '/api/dominios/sincronizar-sei-anatel',
          metodo_http: 'POST',
          empresa_id: empresaIdAudit
        });
      } else {
        const msgOk = `[Sucesso] Sincronização SEI concluída sem falha de PDF. ${result.dominiosAtualizados} domínio(s) atualizado(s), ${result.pdfsDistintos} PDF(s) distinto(s) processado(s), ${result.dominiosCandidatos} domínio(s) elegíveis (sem SEI e com link Anatel).`;
        void registrarAuditoria(req, {
          acao: 'executar',
          entidade: 'Dominio',
          observacoes: msgOk.slice(0, 32000),
          dados_novos: {
            sincronizacao_sei: {
              resultado: 'sucesso',
              dominios_atualizados: result.dominiosAtualizados,
              pdfs_distintos: result.pdfsDistintos,
              dominios_candidatos: result.dominiosCandidatos
            }
          },
          rota: '/api/dominios/sincronizar-sei-anatel',
          metodo_http: 'POST',
          empresa_id: empresaIdAudit
        });
      }

      const msg = [
        `${result.dominiosAtualizados} domínio(s) atualizado(s)`,
        `${result.pdfsDistintos} PDF(s) distinto(s) processado(s)`,
        `${result.dominiosCandidatos} domínio(s) elegíveis (sem SEI e com link Anatel)`
      ].join('. ');
      sendSuccess(res, result, `${msg}.`, 200);
    } catch (error) {
      sendError(res, error, 'Erro ao sincronizar SEI dos ofícios Anatel', 500, true, {
        context: 'DominioController',
        action: 'sincronizarSeiAnatel'
      });
    }
  }

  /**
   * Consulta o download de PDFs disparado por baixarPdfs.
   * A resposta é imediata para não estourar o tempo do proxy.
   */
  static async baixarPdfsStatus(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, obterStatusBaixarPdfs());
  }

  /**
   * Dispara o download dos PDFs de ofício que ainda apontam para outro servidor.
   * Grava em /arquivos/blockdomi e troca o link pela URL deste sistema.
   * O mesmo arquivo é baixado uma vez. A resposta volta na hora; o trabalho segue no servidor.
   */
  static async baixarPdfs(req: Request, res: Response): Promise<void> {
    try {
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? null;
      const publicBaseUrl = (
        process.env.BASE_URL ||
        process.env.APP_URL ||
        `${req.protocol}://${req.get('host') ?? ''}`
      ).replace(/\/$/, '');
      if (!publicBaseUrl) {
        sendValidationError(res, 'URL pública do sistema não configurada');
        return;
      }

      const { iniciado, status } = iniciarBaixarPdfs({ publicBaseUrl }, undefined, {
        aoAtualizar: emitBlockdomiPdfs,
        aoConcluir: (result) => {
          const motivos = textoOcorrenciasAuditoria(result.ocorrencias);
          void registrarAuditoria(req, {
            acao: 'executar',
            entidade: 'Dominio',
            observacoes: `PDFs do Blockdomi gravados neste servidor. Baixados: ${result.pdfsBaixados}. Links atualizados: ${result.registrosAtualizados}. Já locais: ${result.pdfsJaLocais}. Falhas: ${result.falhas}. Não PDF: ${result.ignoradosNaoPdf}.${motivos ? ` Motivos: ${motivos}.` : ''}`.slice(0, 32000),
            dados_novos: { baixar_pdfs: result },
            rota: '/api/dominios/baixar-pdfs',
            metodo_http: 'POST',
            empresa_id: empresaIdAudit,
          });
        },
      });
      sendSuccess(
        res,
        status,
        iniciado
          ? 'Download dos PDFs do Blockdomi iniciado neste servidor.'
          : 'Já existe um download de PDFs do Blockdomi em andamento.',
        202
      );
    } catch (error) {
      sendError(res, error, 'Erro ao baixar PDFs do Blockdomi', 500, true, {
        context: 'DominioController',
        action: 'baixarPdfs',
      });
    }
  }
}
