import { Request, Response } from 'express';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import { logger } from '../../../utils/logger';
import type { AuthenticatedRequest } from '../../../types/auth';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
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
  // Rota pública para o site - retorna apenas dados não sensíveis
  static async getPublic(req: Request, res: Response): Promise<void> {
    try {
      let dadosEmpresa = await DadosEmpresaService.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create(DadosEmpresaController.getDefaultData());
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.normalizePath(dadosEmpresaJson.logo);

      // Criar objeto apenas com dados públicos (sem dados sensíveis)
      const { 
        id: _id, 
        responsavel_nome: _responsavel_nome, 
        responsavel_cpf: _responsavel_cpf, 
        responsavel_cargo: _responsavel_cargo,
        responsavel_assinatura: _responsavel_assinatura,
        inscricao_estadual: _inscricao_estadual, 
        inscricao_municipal, 
        created_at, 
        updated_at,
        ...publicData 
      } = dadosEmpresaJson;
      
      sendSuccess(res, publicData);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar dados públicos da empresa', 500, true, {
        context: 'DadosEmpresaController',
        action: 'getPublic'
      });
    }
  }

  // Rota exclusiva do sistema administrativo - requer autenticação (validada pelo authMiddleware via cookie)
  static async get(req: Request, res: Response): Promise<void> {
    try {
      let dadosEmpresa = await DadosEmpresaService.findOne();

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
      const dadosAtualizados = { ...req.body };
      
      dadosAtualizados.logo = DadosEmpresaController.normalizePath(dadosAtualizados.logo);
      dadosAtualizados.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosAtualizados.responsavel_assinatura);

      let dadosEmpresa = await DadosEmpresaService.findOne();
      const dadosAnteriores = dadosEmpresa ? dadosEmpresa.toJSON() : null;

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create(dadosAtualizados);
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosEmpresa.toJSON() as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        dadosEmpresa = await DadosEmpresaService.update(dadosAtualizados);
        await dadosEmpresa.reload();
        try {
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            dadosEmpresa.toJSON() as Record<string, unknown>
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

      // Sempre usar o mesmo caminho para substituir o arquivo antigo
      const filePath = `/arquivos/empresa/logo.png`;
      let dadosEmpresa = await DadosEmpresaService.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create({ ...DadosEmpresaController.getDefaultData(), logo: filePath });
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosEmpresa.toJSON() as Record<string, unknown>
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
            // Só deletar se for um arquivo diferente do novo
            if (fs.existsSync(oldLogoPath) && !oldLogoPath.endsWith('logo.png')) {
              fs.unlinkSync(oldLogoPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar logo antiga
          }
        }
        const dadosAnteriores = dadosEmpresa.toJSON();
        dadosEmpresa = await DadosEmpresaService.update({ logo: filePath });
        await dadosEmpresa.reload();
        
        try {
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'DadosEmpresa',
            dadosEmpresa.id,
            dadosAnteriores as Record<string, unknown>,
            dadosEmpresa.toJSON() as Record<string, unknown>
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
      const dadosEmpresa = await DadosEmpresaService.findOne();
      
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

      // Sempre usar o mesmo caminho para substituir o arquivo antigo
      const filePath = `/arquivos/empresa/assinatura.png`;
      let dadosEmpresa = await DadosEmpresaService.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresaService.create({ ...DadosEmpresaController.getDefaultData(), responsavel_assinatura: filePath });
      } else {
        // Deletar assinatura antiga se existir (pode ter nome diferente)
        if (dadosEmpresa.responsavel_assinatura) {
          try {
            const fs = require('fs');
            const assinaturaPath = dadosEmpresa.responsavel_assinatura.startsWith('/') 
              ? dadosEmpresa.responsavel_assinatura.substring(1)
              : dadosEmpresa.responsavel_assinatura;
            // Remover prefixo 'arquivos/' e usar resolveArquivosPath
            const pathParts = assinaturaPath.startsWith('arquivos/') 
              ? assinaturaPath.substring('arquivos/'.length).split('/')
              : assinaturaPath.split('/');
            const oldAssinaturaPath = resolveArquivosPath(...pathParts);
            // Só deletar se for um arquivo diferente do novo
            if (fs.existsSync(oldAssinaturaPath) && !oldAssinaturaPath.endsWith('assinatura.png')) {
              fs.unlinkSync(oldAssinaturaPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar assinatura antiga
          }
        }
        dadosEmpresa = await DadosEmpresaService.update({ responsavel_assinatura: filePath });
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