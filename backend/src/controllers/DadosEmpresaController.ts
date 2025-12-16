import { Request, Response } from 'express';
import { DadosEmpresa } from '../models/DadosEmpresa';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types/auth';

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
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create(DadosEmpresaController.getDefaultData());
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
      
      res.json(publicData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar dados públicos da empresa', {
        context: 'DadosEmpresaController',
        action: 'getPublic',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Rota exclusiva do sistema administrativo - requer autenticação
  static async get(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticação - se não houver token válido, bloquear
      const authHeader = req.get('Authorization');
      const authenticatedReq = req as AuthenticatedRequest;
      const hasValidToken = authHeader?.startsWith('Bearer ') && authenticatedReq.user;
      
      if (!hasValidToken) {
        res.status(404).end();
        return;
      }

      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create(DadosEmpresaController.getDefaultData());
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.normalizePath(dadosEmpresaJson.logo);
      dadosEmpresaJson.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosEmpresaJson.responsavel_assinatura);

      // Retornar dados completos apenas para requisições autenticadas do sistema
      res.json(dadosEmpresaJson);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar dados da empresa', {
        context: 'DadosEmpresaController',
        action: 'get',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const dadosAtualizados = { ...req.body };
      
      dadosAtualizados.logo = DadosEmpresaController.normalizePath(dadosAtualizados.logo);
      dadosAtualizados.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosAtualizados.responsavel_assinatura);

      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create(dadosAtualizados);
      } else {
        await dadosEmpresa.update(dadosAtualizados);
        await dadosEmpresa.reload();
      }

      const dadosEmpresaJson = dadosEmpresa.toJSON();
      dadosEmpresaJson.logo = DadosEmpresaController.normalizePath(dadosEmpresaJson.logo);
      dadosEmpresaJson.responsavel_assinatura = DadosEmpresaController.normalizePath(dadosEmpresaJson.responsavel_assinatura);

      res.json(dadosEmpresaJson);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar dados da empresa', {
        context: 'DadosEmpresaController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
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
          res.status(400).json({ 
            success: false,
            message: body.error 
          });
          return;
        }
        res.status(400).json({ 
          success: false,
          message: 'Arquivo não enviado' 
        });
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
        res.status(400).json({ 
          success: false,
          message: 'Tipo de arquivo inválido. Apenas imagens são permitidas (JPG, PNG, GIF, WEBP)' 
        });
        return;
      }

      const filePath = `/uploads/empresa/${req.file.filename}`;
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create({ ...DadosEmpresaController.getDefaultData(), logo: filePath });
      } else {
        // Deletar logo antiga se existir
        if (dadosEmpresa.logo) {
          try {
            const fs = require('fs');
            const path = require('path');
            const oldLogoPath = dadosEmpresa.logo.startsWith('/') 
              ? path.join(process.cwd(), dadosEmpresa.logo)
              : path.join(process.cwd(), dadosEmpresa.logo);
            if (fs.existsSync(oldLogoPath)) {
              fs.unlinkSync(oldLogoPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar logo antiga
          }
        }
        await dadosEmpresa.update({ logo: filePath });
      }

      res.json({ success: true, logo: filePath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao fazer upload da logo', {
        context: 'DadosEmpresaController',
        action: 'uploadLogo',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ 
        success: false,
        message: errorMessage 
      });
    }
  }

  static async getLogo(req: Request, res: Response): Promise<void> {
    try {
      const dadosEmpresa = await DadosEmpresa.findOne();
      
      if (!dadosEmpresa || !dadosEmpresa.logo) {
        res.status(404).json({ error: 'Logo não encontrada' });
        return;
      }

      // Redirecionar para o arquivo de upload
      res.redirect(dadosEmpresa.logo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar logo', {
        context: 'DadosEmpresaController',
        action: 'getLogo',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
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
          res.status(400).json({ 
            success: false,
            message: body.error 
          });
          return;
        }
        res.status(400).json({ 
          success: false,
          message: 'Arquivo não enviado' 
        });
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
        res.status(400).json({ 
          success: false,
          message: 'Tipo de arquivo inválido. Apenas arquivos PNG são permitidos' 
        });
        return;
      }

      const filePath = `/uploads/empresa/${req.file.filename}`;
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create({ ...DadosEmpresaController.getDefaultData(), responsavel_assinatura: filePath });
      } else {
        // Deletar assinatura antiga se existir
        if (dadosEmpresa.responsavel_assinatura) {
          try {
            const fs = require('fs');
            const path = require('path');
            const oldAssinaturaPath = dadosEmpresa.responsavel_assinatura.startsWith('/') 
              ? path.join(process.cwd(), dadosEmpresa.responsavel_assinatura)
              : path.join(process.cwd(), dadosEmpresa.responsavel_assinatura);
            if (fs.existsSync(oldAssinaturaPath)) {
              fs.unlinkSync(oldAssinaturaPath);
            }
          } catch (err) {
            // Ignorar erro ao deletar assinatura antiga
          }
        }
        await dadosEmpresa.update({ responsavel_assinatura: filePath });
      }

      res.json({ success: true, responsavel_assinatura: filePath });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao fazer upload da assinatura', {
        context: 'DadosEmpresaController',
        action: 'uploadAssinatura',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ 
        success: false,
        message: errorMessage 
      });
    }
  }
}