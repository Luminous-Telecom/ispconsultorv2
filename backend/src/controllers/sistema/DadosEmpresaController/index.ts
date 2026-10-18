import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { getEmpresaIdOrNull, isAdminRequest, parseEmpresaIdQuery } from '../../../utils/tenantUtils';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import path from 'path';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { sendSuccess, sendError, sendForbidden, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { parseIdsFromQueryParam, queryString } from '../../../utils/listQuery';

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

  private static resolveRequestedEmpresaId(req: Request, res: Response): number | null | false {
    const rawId = req.params.id;
    if (rawId == null || rawId === '') {
      return getEmpresaIdOrNull(req);
    }

    const empresaId = parseInt(String(rawId), 10);
    if (!Number.isFinite(empresaId) || empresaId <= 0) {
      sendValidationError(res, 'ID da empresa inválido');
      return false;
    }

    const tokenEmpresaId = getEmpresaIdOrNull(req);
    if (!isAdminRequest(req) && tokenEmpresaId !== empresaId) {
      sendForbidden(res, 'Você não tem permissão para acessar os dados desta empresa');
      return false;
    }

    return empresaId;
  }

  // Rota pública — retorna apenas logo, nome_fantasia e razao_social (para login e central do assinante)
  static async getPublic(req: Request, res: Response): Promise<void> {
    try {
      const dadosEmpresa = await DadosEmpresaService.findOne();
      const data = dadosEmpresa ? (toPlain(dadosEmpresa) as Record<string, unknown>) : {};
      sendSuccess(res, {
        logo: DadosEmpresaController.normalizePath(data.logo as string | undefined),
        nome_fantasia: (data.nome_fantasia as string) || null,
        razao_social: (data.razao_social as string) || null,
        updated_at: data.updated_at ?? null,
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
      const data = toPlain(dadosEmpresa) as Record<string, unknown>;
      sendSuccess(res, {
        logo: DadosEmpresaController.normalizePath(data.logo as string | undefined),
        nome_fantasia: (data.nome_fantasia as string) || null,
        razao_social: (data.razao_social as string) || null,
        updated_at: data.updated_at ?? null,
      });
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dados públicos da empresa por slug', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getPublicBySlug'
      });
    }
  }

  // Rota exclusiva do sistema administrativo - requer autenticação (validada pelo authMiddleware via cookie)
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = DadosEmpresaController.resolveRequestedEmpresaId(req, res);
      if (empresaId === false) return;

      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        if (empresaId != null) {
          sendNotFound(res, 'Dados da empresa não encontrados');
          return;
        }
        dadosEmpresa = await DadosEmpresaService.create(DadosEmpresaController.getDefaultData());
      }

      const dadosEmpresaJson = toPlain(dadosEmpresa);
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
      const empresaId = DadosEmpresaController.resolveRequestedEmpresaId(req, res);
      if (empresaId === false) return;

      const dadosAtualizados = { ...req.body };

      dadosAtualizados.logo = DadosEmpresaController.normalizePath(dadosAtualizados.logo);
      dadosAtualizados.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosAtualizados.responsavel_assinatura);

      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);
      const dadosAnteriores = dadosEmpresa ? toPlain(dadosEmpresa) : null;

      if (!dadosEmpresa) {
        if (empresaId != null) {
          sendNotFound(res, 'Dados da empresa não encontrados');
          return;
        }
        dadosEmpresa = await DadosEmpresaService.create(dadosAtualizados);
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            toPlain(dadosEmpresa) as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        dadosEmpresa = await DadosEmpresaService.update(dadosAtualizados, empresaId ?? undefined);
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            toPlain(dadosEmpresa) as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      const dadosEmpresaJson = toPlain(dadosEmpresa);
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

      const empresaId = DadosEmpresaController.resolveRequestedEmpresaId(req, res);
      if (empresaId === false) return;

      const subdir = String(empresaId ?? 'default');
      const ext = path.extname(req.file.originalname || '') || '.png';
      const filePath = `/arquivos/empresa/${subdir}/logo${ext}`;
      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        if (empresaId != null) {
          sendNotFound(res, 'Dados da empresa não encontrados');
          return;
        }
        dadosEmpresa = await DadosEmpresaService.create({
          ...DadosEmpresaController.getDefaultData(),
          logo: filePath,
          updated_at: new Date(),
        });
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            toPlain(dadosEmpresa) as Record<string, unknown>,
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
        const dadosAnteriores = toPlain(dadosEmpresa);
        // updated_at força cache-bust no frontend (mesmo path logo.png)
        dadosEmpresa = await DadosEmpresaService.update(
          { logo: filePath, updated_at: new Date() },
          empresaId ?? undefined
        );
        
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            toPlain(dadosEmpresa) as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, {
        success: true,
        logo: filePath,
        updated_at: dadosEmpresa.updated_at,
      });
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

      const empresaId = DadosEmpresaController.resolveRequestedEmpresaId(req, res);
      if (empresaId === false) return;

      const subdir = String(empresaId ?? 'default');
      const ext = path.extname(req.file.originalname || '') || '.png';
      const filePath = `/arquivos/empresa/${subdir}/assinatura${ext}`;
      let dadosEmpresa = await DadosEmpresaService.findOne(empresaId ?? undefined);

      if (!dadosEmpresa) {
        if (empresaId != null) {
          sendNotFound(res, 'Dados da empresa não encontrados');
          return;
        }
        dadosEmpresa = await DadosEmpresaService.create({ ...DadosEmpresaController.getDefaultData(), responsavel_assinatura: filePath });
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            toPlain(dadosEmpresa) as Record<string, unknown>,
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
        const dadosAnteriores = toPlain(dadosEmpresa);
        dadosEmpresa = await DadosEmpresaService.update({ responsavel_assinatura: filePath }, empresaId ?? undefined);
        try {
          const empresaIdAudit = empresaId ?? dadosEmpresa.id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            toPlain(dadosEmpresa) as Record<string, unknown>,
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