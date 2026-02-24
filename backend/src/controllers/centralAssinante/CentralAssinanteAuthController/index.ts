import { Request, Response as ExpressResponse } from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { Op } from 'sequelize';
import { sequelize } from '../../../config/database';
import { Cliente } from '../../../models/clientes/Cliente';
import { Parametro } from '../../../models/sistema/Parametro';
import { ServidorEmail } from '../../../models/comunicacao/ServidorEmail';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized, sendForbidden, sendNotFound } from '../../../utils/responseUtils';
import { CentralAssinanteController } from '../CentralAssinanteController';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import nodemailer from 'nodemailer';

const loginSchema = Joi.object({
  login: Joi.string().required().messages({
    'string.empty': 'Login é obrigatório',
    'any.required': 'Login é obrigatório'
  }),
  senha: Joi.string().required().messages({
    'string.empty': 'Senha é obrigatória',
    'any.required': 'Senha é obrigatória'
  })
});

export class CentralAssinanteAuthController {
  /**
   * Login na central do assinante
   */
  static async login(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          acc[field] = acc[field] || [];
          acc[field].push(detail.message);
          return acc;
        }, {}));
        return;
      }

      const { login, senha } = value;
      const { slug } = req.params;

      // Resolver empresa pelo slug
      const empresa = slug ? await DadosEmpresaService.findBySlug(slug) : await DadosEmpresaService.findOne();
      if (!empresa) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      const empresaId = empresa.id;

      // Buscar parâmetro de método de login (filtrado pela empresa)
      const parametroMetodo = await Parametro.findOne({
        where: { chave: 'central_assinante_metodo_login', ativo: true, empresa_id: empresaId }
      });

      const metodoLogin = parametroMetodo?.valor || 'cnpj';

      // Buscar cliente por CNPJ ou Email conforme parâmetro
      let cliente: Cliente | null = null;

      if (metodoLogin === 'email') {
        cliente = await Cliente.findOne({
          where: { email: login, ativo: true, empresa_id: empresaId }
        });
      } else {
        // Remover formatação do CNPJ para busca
        const cnpjLimpo = login.replace(/\D/g, '');
        cliente = await Cliente.findOne({
          where: { cnpj: cnpjLimpo, ativo: true, empresa_id: empresaId }
        });
      }

      if (!cliente) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      // Verificar se tem senha cadastrada
      if (!cliente.central_assinante_senha) {
        sendUnauthorized(res, 'Senha não cadastrada. Entre em contato com o suporte.');
        return;
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(senha, cliente.central_assinante_senha);

      if (!isPasswordValid) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      // Gerar token de acesso
      const token = CentralAssinanteController.gerarToken(cliente.id);
      const link = CentralAssinanteController.gerarLinkCentralAssinante(cliente.id, undefined, slug);

      logger.info('Login realizado na central do assinante', {
        cliente_id: cliente.id,
        empresa_id: empresaId,
        slug,
        metodo_login: metodoLogin,
      });

      sendSuccess(res, {
        token,
        cliente_id: cliente.id,
        link,
        cliente: {
          id: cliente.id,
          razao_social: cliente.razao_social,
          nome_fantasia: cliente.nome_fantasia
        }
      }, 'Login realizado com sucesso');
    } catch (error) {
      logger.error('Erro ao realizar login na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'CentralAssinanteAuthController',
        action: 'login'
      });
    }
  }

  /**
   * Recuperar senha da central do assinante
   */
  static async recuperarSenha(req: Request, res: ExpressResponse): Promise<void> {
    try {
      logger.info('Iniciando recuperação de senha');

      const recuperarSenhaSchema = Joi.object({
        cnpj: Joi.string().required().messages({
          'string.empty': 'CNPJ é obrigatório',
          'any.required': 'CNPJ é obrigatório'
        }),
        email: Joi.string().email().required().messages({
          'string.email': 'Email inválido',
          'string.empty': 'Email é obrigatório',
          'any.required': 'Email é obrigatório'
        })
      });

      const { error, value } = recuperarSenhaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        logger.warn('Erro de validação na recuperação de senha', {
          errors: error.details,
          body: req.body
        });
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          acc[field] = acc[field] || [];
          acc[field].push(detail.message);
          return acc;
        }, {}));
        return;
      }

      const { cnpj, email } = value;
      const { slug } = req.params;

      // Resolver empresa pelo slug
      const empresa = slug ? await DadosEmpresaService.findBySlug(slug) : await DadosEmpresaService.findOne();
      if (!empresa) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      const empresaId = empresa.id;

      // Remover formatação do CNPJ para busca
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      // Normalizar email: lowercase, trim e remover espaços extras
      const emailLimpo = email.toLowerCase().trim().replace(/\s+/g, '');

      logger.info('Buscando cliente para recuperação de senha', { cnpjLimpo, emailLimpo, empresaId });

      // Buscar cliente por CNPJ e Email separadamente (filtrado pela empresa)
      const clientePorCnpj = await Cliente.findOne({ where: { cnpj: cnpjLimpo, ativo: true, empresa_id: empresaId } });
      const clientePorEmail = await Cliente.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('email')),
              emailLimpo
            )
          ],
          ativo: true,
          empresa_id: empresaId,
        }
      });

      // Verificar se encontrou cliente e se CNPJ e Email pertencem ao mesmo cliente
      let cliente: Cliente | null = null;

      if (clientePorCnpj && clientePorEmail) {
        // Ambos existem - verificar se são o mesmo cliente
        if (clientePorCnpj.id === clientePorEmail.id) {
          cliente = clientePorCnpj;
        } else {
          sendUnauthorized(res, 'CNPJ e Email informados não pertencem ao mesmo cliente');
          return;
        }
      } else if (clientePorCnpj) {
        // Só CNPJ encontrado
        sendUnauthorized(res, 'Email não corresponde ao CNPJ informado');
        return;
      } else if (clientePorEmail) {
        // Só Email encontrado - verificar se o CNPJ do cliente encontrado corresponde ao recebido
        if (clientePorEmail.cnpj?.replace(/\D/g, '') === cnpjLimpo) {
          cliente = clientePorEmail;
        } else {
          sendUnauthorized(res, 'CNPJ não corresponde ao Email informado');
          return;
        }
      } else {
        sendUnauthorized(res, 'CNPJ ou Email incorreto');
        return;
      }

      logger.info('Cliente encontrado para recuperação de senha', {
        clienteId: cliente.id,
        temSenhaCadastrada: !!cliente.central_assinante_senha
      });

      // Verificar se tem senha cadastrada
      if (!cliente.central_assinante_senha) {
        sendUnauthorized(res, 'Senha não cadastrada. Entre em contato com o suporte.');
        return;
      }

      // Buscar servidor de email ativo (filtrado pela empresa)
      const servidorEmail = await ServidorEmail.findOne({
        where: { ativo: true, empresa_id: empresaId }
      });

      if (!servidorEmail) {
        logger.error('Nenhum servidor de email ativo encontrado para recuperação de senha');
        sendError(res, new Error('Servidor de email não configurado'), 'Erro ao enviar email', 500, true);
        return;
      }

      // Gerar senha temporária (12 caracteres alfanuméricos)
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let senhaTemporaria = '';
      for (let i = 0; i < 12; i++) {
        senhaTemporaria += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      const senhaTemporariaHash = await bcrypt.hash(senhaTemporaria, 10);

      // Atualizar senha do cliente com a senha temporária
      await cliente.update({
        central_assinante_senha: senhaTemporariaHash
      });

      // Criar transporter
      const transporter = nodemailer.createTransport({
        host: servidorEmail.host,
        port: servidorEmail.porta,
        secure: servidorEmail.ssl,
        auth: {
          user: servidorEmail.usuario,
          pass: servidorEmail.senha
        },
        tls: servidorEmail.tls ? {
          rejectUnauthorized: false
        } : undefined
      });

      // Preparar conteúdo do email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Recuperação de Senha - Central do Assinante</h2>
          <p>Olá <strong>${cliente.razao_social || cliente.nome_fantasia || 'Cliente'}</strong>,</p>
          <p>Você solicitou a recuperação de senha da Central do Assinante.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">Sua nova senha temporária:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #212529; letter-spacing: 2px; font-family: monospace;">${senhaTemporaria}</p>
          </div>
          <p style="color: #dc3545; font-size: 12px; margin-top: 20px;">
            <strong>⚠️ Importante:</strong> Esta é uma senha temporária. Recomendamos que você altere sua senha após fazer login.
          </p>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            Este é um e-mail automático do sistema BackNet. Por favor, não responda este e-mail.
          </p>
        </div>
      `;

      // Enviar email
      const mailOptions = {
        from: `"${servidorEmail.nome_remetente}" <${servidorEmail.email_remetente}>`,
        to: cliente.email,
        subject: 'Recuperação de Senha - Central do Assinante',
        html: emailHtml
      };

      await transporter.sendMail(mailOptions);

      logger.info('Email de recuperação de senha enviado com sucesso', {
        cliente_id: cliente.id,
        empresa_id: empresaId,
        razaoSocial: cliente.razao_social,
      });

      sendSuccess(res, undefined, 'Instruções para recuperação de senha foram enviadas para seu email');
    } catch (error) {
      logger.error('Erro ao recuperar senha na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'CentralAssinanteAuthController',
        action: 'recuperarSenha'
      });
    }
  }

  /**
   * Trocar senha da central do assinante
   */
  static async trocarSenha(req: Request, res: ExpressResponse): Promise<void> {
    try {
      // Validar token e obter clienteId (suporta params antigos e token via header)
      const clienteId = CentralAssinanteController.getClienteIdFromRequest(req);
      if (!clienteId) {
        sendForbidden(res, 'Token inválido ou expirado');
        return;
      }

      const trocarSenhaSchema = Joi.object({
        senhaAtual: Joi.string().required().messages({
          'string.empty': 'Senha atual é obrigatória',
          'any.required': 'Senha atual é obrigatória'
        }),
        novaSenha: Joi.string().min(6).required().messages({
          'string.empty': 'Nova senha é obrigatória',
          'string.min': 'Nova senha deve ter no mínimo 6 caracteres',
          'any.required': 'Nova senha é obrigatória'
        })
      });

      const { error, value } = trocarSenhaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          acc[field] = acc[field] || [];
          acc[field].push(detail.message);
          return acc;
        }, {}));
        return;
      }

      const { senhaAtual, novaSenha } = value;

      // Buscar cliente
      const cliente = await Cliente.findByPk(clienteId);

      if (!cliente) {
        sendNotFound(res, 'Cliente não encontrado');
        return;
      }

      if (!cliente.ativo) {
        sendUnauthorized(res, 'Cliente inativo');
        return;
      }

      // Verificar se tem senha cadastrada
      if (!cliente.central_assinante_senha) {
        sendUnauthorized(res, 'Senha não cadastrada. Use a opção de recuperar senha.');
        return;
      }

      // Verificar senha atual
      const isPasswordValid = await bcrypt.compare(senhaAtual, cliente.central_assinante_senha);

      if (!isPasswordValid) {
        sendUnauthorized(res, 'Senha atual incorreta');
        return;
      }

      // Hash da nova senha
      const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha
      await cliente.update({
        central_assinante_senha: novaSenhaHash
      });

      logger.info('Senha alterada na central do assinante', {
        cliente_id: cliente.id,
      });

      sendSuccess(res, undefined, 'Senha alterada com sucesso');
    } catch (error) {
      logger.error('Erro ao trocar senha na central do assinante', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body
      });
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'CentralAssinanteAuthController',
        action: 'trocarSenha'
      });
    }
  }
}
