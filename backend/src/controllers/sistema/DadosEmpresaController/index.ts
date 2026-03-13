import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import { SaasTituloService } from '../../../services/saas/SaasCrudService';
import { SaasTitulo } from '../../../models/saas/SaasTitulo';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { saasTituloToTituloComRelacoes } from '../../titulos/TituloHelpers/saasTituloToTituloComRelacoes';
import { TituloPDFService } from '../../../services/titulos/TituloPDFService';
import { SaasTituloBoletoService } from '../../../services/saas/SaasTituloBoletoService';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import path from 'path';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';

export class DadosEmpresaController {
  // Dados padrão para criação de empresa
  private static getDefaultData() {
    return {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      telefone: '',
      celular: '',
      email: '',
      site: '',
      responsavel_nome: '',
      responsavel_cpf: '',
      responsavel_cargo: '',
      responsavel_assinatura: null as string | null,
      logo: null as string | null
    };
  }

  // Garantir que o path seja relativo e comece com /
  private static normalizePath(path: string | null | undefined): string | null {
    if (!path || typeof path !== 'string') return null;
    // Garantir que o path comece com /
    return path.startsWith('/') ? path : `/${path}`;
  }

  // Rota pública — retorna apenas logo, nome_fantasia e razao_social (para login e central do assinante)
  static async getPublic(req: Request, res: Response): Promise<void> {
    try {
      const dadosEmpresa = await DadosEmpresaService.findOne();
      const data = dadosEmpresa ? (dadosEmpresa.toJSON() as Record<string, unknown>) : {};
      sendSuccess(res, {
        logo: DadosEmpresaController.normalizePath(data.logo as string | undefined),
        nome_fantasia: (data.nome_fantasia as string) || null,
        razao_social: (data.razao_social as string) || null,
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dados públicos da empresa', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getPublic'
      });
    }
  }

  // Rota pública por slug — retorna logo, nome_fantasia e razao_social da empresa identificada pelo slug
  static async getPublicBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const dadosEmpresa = await DadosEmpresaService.findBySlug(slug);
      if (!dadosEmpresa) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      const data = dadosEmpresa.toJSON() as Record<string, unknown>;
      sendSuccess(res, {
        logo: DadosEmpresaController.normalizePath(data.logo as string | undefined),
        nome_fantasia: (data.nome_fantasia as string) || null,
        razao_social: (data.razao_social as string) || null,
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dados públicos da empresa por slug', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getPublicBySlug'
      });
    }
  }

  /**
   * Lista saas_titulos por empresa_id (adm_dados_empresa).
   * Usa auth admin para permitir visualizar titulos SaaS da empresa no modal Dados Empresa.
   * Query: tipo=abertas (pendente,vencido) ou tipo=pagas (pago,pago_atraso,parcial). Default: abertas.
   */
  static async getTitulosSaas(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = req.query.empresa_id != null ? Number(req.query.empresa_id) : NaN;
      if (Number.isNaN(empresaId) || empresaId <= 0) {
        sendError(res, new Error('empresa_id inválido'), 'empresa_id obrigatório e deve ser maior que zero', 400);
        return;
      }
      const tipo = (req.query.tipo as string) || 'abertas';
      const statusFilter = tipo === 'pagas' ? 'pago,pago_atraso,parcial' : 'pendente,vencido';
      const result = await SaasTituloService.list({
        empresa_id: empresaId,
        status: statusFilter,
        limit: 50,
        sortColumn: 'data_vencimento',
        sortDirection: tipo === 'pagas' ? 'desc' : 'asc',
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar títulos da empresa', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getTitulosSaas',
      });
    }
  }

  /**
   * Gera PDF de boletos de saas_titulos (admin auth).
   * Requer ids e empresa_id para validar que os títulos pertencem à empresa.
   */
  static async getTitulosSaasBoletosPdf(req: Request, res: Response): Promise<void> {
    let ids: number[] = [];
    try {
      const empresaId = req.query.empresa_id != null ? Number(req.query.empresa_id) : NaN;
      if (Number.isNaN(empresaId) || empresaId <= 0) {
        sendValidationError(res, 'empresa_id obrigatório e deve ser maior que zero');
        return;
      }
      const idsParam = req.query.ids as string;
      if (idsParam) {
        try {
          const parsed = JSON.parse(idsParam);
          ids = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          ids = idsParam.split(',').map((id: string) => parseInt(id.trim(), 10)).filter((id: number) => !isNaN(id));
        }
      }
      if (!ids || ids.length === 0) {
        sendValidationError(res, 'IDs dos títulos não fornecidos');
        return;
      }

      const tituloIncludes = [
        { model: SaasDadosEmpresa, as: 'empresa', attributes: ['id', 'razao_social', 'nome_empresa', 'nome_fantasia', 'cnpj', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] },
        { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'] },
        { model: SaasBanco, as: 'banco', attributes: ['id', 'nome', 'banco', 'tipo_banco', 'codigo', 'percentual_multa', 'percentual_juros', 'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5'] },
      ];

      const saasTitulos = await SaasTitulo.findAll({
        where: { id: { [Op.in]: ids }, empresa_id: empresaId },
        include: tituloIncludes,
      });

      if (saasTitulos.length === 0) {
        sendNotFound(res, 'Nenhum título encontrado');
        return;
      }

      type SaasTituloComIncludes = SaasTitulo & { banco?: SaasBanco | null; empresa?: SaasDadosEmpresa | null; plano?: SaasPlano | null };
      const filtrados = saasTitulos.filter((t: SaasTituloComIncludes) => t.status !== 'cancelado');

      const titulosComRelacoes: import('../../titulos/TituloHelpers/types').TituloComRelacoes[] = [];
      for (const st of filtrados as SaasTituloComIncludes[]) {
        if (!st.banco) continue;
        if (!st.charge_id) {
          try {
            const resultado = await SaasTituloBoletoService.gerarBoleto(st.id);
            if (resultado.success) {
              const recarregado = await SaasTitulo.findByPk(st.id, { include: tituloIncludes });
              if (recarregado) {
                titulosComRelacoes.push(saasTituloToTituloComRelacoes(recarregado));
              } else {
                titulosComRelacoes.push(saasTituloToTituloComRelacoes(st));
              }
            } else {
              titulosComRelacoes.push(saasTituloToTituloComRelacoes(st));
            }
          } catch {
            titulosComRelacoes.push(saasTituloToTituloComRelacoes(st));
          }
        } else {
          titulosComRelacoes.push(saasTituloToTituloComRelacoes(st));
        }
      }

      if (titulosComRelacoes.length === 0) {
        sendValidationError(res, 'Nenhum boleto válido para gerar PDF');
        return;
      }

      const pdfBuffer = await TituloPDFService.gerarPdfDeMultiplosBoletos(titulosComRelacoes);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="boletos-${titulosComRelacoes.length}-titulos.pdf"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.send(pdfBuffer);
    } catch (err) {
      sendError(res, err, 'Erro ao gerar PDF de boletos', 500, true);
    }
  }

  // Rota exclusiva do sistema administrativo - requer autenticação (validada pelo authMiddleware via cookie)
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create(DadosEmpresaController.getDefaultData());
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.normalizePath(dadosEmpresaJson.logo);
      dadosEmpresaJson.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosEmpresaJson.responsavel_assinatura);

      // Retornar dados completos apenas para requisições autenticadas do sistema
      sendSuccess(res, dadosEmpresaJson);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dados da empresa', 500, true, {
        context: 'DadosEmpresaController',
        action: 'get'
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const dadosAtualizados = { ...req.body };

      dadosAtualizados.logo = DadosEmpresaController.normalizePath(dadosAtualizados.logo);
      dadosAtualizados.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosAtualizados.responsavel_assinatura);

      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);
      const dadosAnteriores = dadosEmpresa ? dadosEmpresa.toJSON() : null;

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create(dadosAtualizados);
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        dadosEmpresa = await DadosEmpresaService.update(dadosAtualizados, empresaId ?? undefined);
        await dadosEmpresa.reload();
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.normalizePath(dadosEmpresaJson.logo);
      dadosEmpresaJson.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosEmpresaJson.responsavel_assinatura);

      sendSuccess(res, dadosEmpresaJson);
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar dados da empresa', 500, true, {
        context: 'DadosEmpresaController',
        action: 'update',
        body: req.body
      });
    }
  }

  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        // Verificar se é erro do multer
        interface MulterErrorBody {
          error?: string;
        }
        const body = req.body as MulterErrorBody;
        if (body && body.error) {
          sendValidationError(res, body.error);
          return;
        }
        sendValidationError(res, 'Arquivo não enviado');
        return;
      }

      // Validar tipo de arquivo
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        // Deletar arquivo inválido se foi salvo
        if (req.file.path) {
          try {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch {}
        }
        sendValidationError(res, 'Tipo de arquivo inválido. Apenas imagens são permitidas (JPG, PNG, GIF, WEBP)');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const subdir = String(empresaId ?? 'default');
      const ext = path.extname(req.file.originalname || '') || '.png';
      const filePath = `/arquivos/empresa/${subdir}/logo${ext}`;
      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create({ ...DadosEmpresaController.getDefaultData(), logo: filePath });
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        // Deletar logo antiga se existir (pode ter nome diferente)
        if (dadosEmpresa.logo) {
          try {
            const fs = require('fs');
            const logoPath = dadosEmpresa.logo.startsWith('/') 
              ? dadosEmpresa.logo.substring(1)
              : dadosEmpresa.logo;
            // Remover prefixo 'arquivos/' e usar resolveArquivosPath
            const pathParts = logoPath.startsWith('arquivos/') 
              ? logoPath.substring('arquivos/'.length).split('/')
              : logoPath.split('/');
            const oldLogoPath = resolveArquivosPath(...pathParts);
            if (fs.existsSync(oldLogoPath) && oldLogoPath !== req.file.path) {
              fs.unlinkSync(oldLogoPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar logo antiga
          }
        }
        const dadosAnteriores = dadosEmpresa.toJSON();
        dadosEmpresa = await DadosEmpresaService.update({ logo: filePath }, empresaId ?? undefined);
        await dadosEmpresa.reload();
        
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, { success: true, logo: filePath });
    } catch (error) {
      sendError(res, error, 'Erro ao fazer upload da logo', 500, true, {
        context: 'DadosEmpresaController',
        action: 'uploadLogo'
      });
    }
  }

  static async getLogo(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);
      
      if (!dadosEmpresa || !dadosEmpresa.logo) {
        sendNotFound(res, 'Logo não encontrada');
        return;
      }

      // Redirecionar para o arquivo de upload
      res.redirect(dadosEmpresa.logo);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar logo', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getLogo'
      });
    }
  }

  static async uploadAssinatura(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        // Verificar se é erro do multer
        interface MulterErrorBody {
          error?: string;
        }
        const body = req.body as MulterErrorBody;
        if (body && body.error) {
          sendValidationError(res, body.error);
          return;
        }
        sendValidationError(res, 'Arquivo não enviado');
        return;
      }

      // Validar tipo de arquivo - apenas PNG (validação adicional)
      const allowedMimes = ['image/png', 'image/x-png'];
      if (!allowedMimes.includes(req.file.mimetype) && !req.file.originalname.toLowerCase().endsWith('.png')) {
        // Deletar arquivo inválido se foi salvo
        if (req.file.path) {
          try {
            const fs = require('fs');
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } catch {}
        }
        sendValidationError(res, 'Tipo de arquivo inválido. Apenas arquivos PNG são permitidos');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const subdir = String(empresaId ?? 'default');
      const ext = path.extname(req.file.originalname || '') || '.png';
      const filePath = `/arquivos/empresa/${subdir}/assinatura${ext}`;
      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create({ ...DadosEmpresaController.getDefaultData(), responsavel_assinatura: filePath });
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        if (dadosEmpresa.responsavel_assinatura) {
          try {
            const fs = require('fs');
            const assinaturaPath = dadosEmpresa.responsavel_assinatura.startsWith('/') 
              ? dadosEmpresa.responsavel_assinatura.substring(1)
              : dadosEmpresa.responsavel_assinatura;
            const pathParts = assinaturaPath.startsWith('arquivos/') 
              ? assinaturaPath.substring('arquivos/'.length).split('/')
              : assinaturaPath.split('/');
            const oldAssinaturaPath = resolveArquivosPath(...pathParts);
            if (fs.existsSync(oldAssinaturaPath) && oldAssinaturaPath !== req.file.path) {
              fs.unlinkSync(oldAssinaturaPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar assinatura antiga
          }
        }
        const dadosAnteriores = dadosEmpresa.toJSON();
        dadosEmpresa = await DadosEmpresaService.update({ responsavel_assinatura: filePath }, empresaId ?? undefined);
        await dadosEmpresa.reload();
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            dadosEmpresa.toJSON() as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, { success: true, responsavel_assinatura: filePath });
    } catch (error) {
      sendError(res, error, 'Erro ao fazer upload da assinatura', 500, true, {
        context: 'DadosEmpresaController',
        action: 'uploadAssinatura'
      });
    }
  }
}