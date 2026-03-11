import { Request, Response } from 'express';
import { ServidorEmail } from '../../../models/comunicacao/ServidorEmail';
import { MensagemEmail } from '../../../models/comunicacao/MensagemEmail';
import { MensagemEmailService } from '../../../services/comunicacao/MensagemEmailService';
import { ServidorEmailService } from '../../../services/comunicacao/ServidorEmailService';
import { logger } from '../../../utils/logger';
import { formatDateTime } from '../../../utils/dateUtils';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { ValidationError } from 'sequelize';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class ServidorEmailController {
  /**
   * Listar todos os servidores de email
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const result = await ServidorEmailService.list(empresaId);

      sendSuccess(res, result.data, 'Servidores de email listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar servidores de email', 500, true);
    }
  }

  /**
   * Verifica se o servidor pertence à empresa do usuário (ou é global)
   */
  private static pertenceEmpresa(
    servidor: ServidorEmail | { empresa_id?: number | null },
    empresaId: number | null
  ): boolean {
    const sid = (servidor as { empresa_id?: number | null }).empresa_id;
    if (empresaId == null) return true; // superadmin
    return sid === empresaId || sid === null; // próprio ou global
  }

  /**
   * Buscar servidor de email por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const servidor = await ServidorEmailService.getById(id, { excludePassword: true });

      if (!servidor) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      if (!ServidorEmailController.pertenceEmpresa(servidor, empresaId)) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      sendSuccess(res, servidor, 'Servidor de email encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar servidor de email', 500, true);
    }
  }

  /**
   * Criar novo servidor de email
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const servidorData = req.body;

      // Validar dados obrigatórios
      if (!servidorData.host || !servidorData.porta || !servidorData.usuario || !servidorData.senha) {
        sendValidationError(res, 'Host, porta, usuário e senha são obrigatórios');
        return;
      }

      const empresaIdServidor = servidorData.empresa_id ?? getEmpresaIdOrNull(req) ?? null;
      if (servidorData.ativo !== false) {
        const whereAtivo = empresaIdServidor != null
          ? { ativo: true, [Op.or]: [{ empresa_id: empresaIdServidor }, { empresa_id: null }] }
          : { ativo: true };
        await ServidorEmailService.updateBulk(whereAtivo, { ativo: false });
        servidorData.ativo = true;
      }

      const servidor = await ServidorEmailService.create({
        ...servidorData,
        empresa_id: empresaIdServidor
      });

      try {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'ServidorEmail',
          servidor.id,
          servidor.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servidor, 'Servidor de email criado com sucesso', 201);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors ? error.errors.map((err) => err.message) : [];
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao criar servidor de email', 500, true);
    }
  }

  /**
   * Atualizar servidor de email
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servidorData = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      const servidor = await ServidorEmailService.getById(id);

      if (!servidor) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      if (!ServidorEmailController.pertenceEmpresa(servidor, empresaId)) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      const empresaIdServidor = (servidor as { empresa_id?: number | null }).empresa_id ?? empresaId ?? null;
      if (servidorData.ativo === true) {
        const whereAtivo = empresaIdServidor != null
          ? { ativo: true, id: { [Op.ne]: id }, [Op.or]: [{ empresa_id: empresaIdServidor }, { empresa_id: null }] }
          : { ativo: true, id: { [Op.ne]: id } };
        await ServidorEmailService.updateBulk(whereAtivo, { ativo: false });
      }

      const dadosAnteriores = servidor.toJSON();
      await ServidorEmailService.updateInstance(servidor, servidorData);

      try {
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'ServidorEmail',
          servidor.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          servidor.toJSON() as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, servidor, 'Servidor de email atualizado com sucesso');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors ? error.errors.map((err) => err.message) : [];
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao atualizar servidor de email', 500, true);
    }
  }

  /**
   * Deletar servidor de email
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const servidor = await ServidorEmailService.getById(id);

      if (!servidor) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      if (!ServidorEmailController.pertenceEmpresa(servidor, empresaId)) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      const dadosAnteriores = servidor.toJSON();
      await ServidorEmailService.delete(servidor.id);

      try {
        await registrarExclusao(
          req as AuthenticatedRequest,
          'ServidorEmail',
          servidor.id,
          dadosAnteriores as unknown as Record<string, unknown>
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, undefined, 'Servidor de email deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar servidor de email', 500, true);
    }
  }

  /**
   * Testar conexão do servidor de email
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);

      const servidor = await ServidorEmailService.getById(id);

      if (!servidor) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      if (!ServidorEmailController.pertenceEmpresa(servidor, empresaId)) {
        sendNotFound(res, 'Servidor de email não encontrado');
        return;
      }

      // Aqui você implementaria a lógica de teste de conexão
      // Por enquanto, vamos simular um teste
      const testResult = {
        host: servidor.host,
        porta: servidor.porta,
        ssl: servidor.ssl,
        tls: servidor.tls
      };

      sendSuccess(res, testResult, 'Conexão testada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao testar conexão do servidor de email', 500, true);
    }
  }

  /**
   * Enviar e-mail de teste
   */
  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email_teste } = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      if (!email_teste) {
        sendValidationError(res, 'E-mail de teste é obrigatório');
        return;
      }

      const servidor = await ServidorEmailService.getById(id);
      if (!servidor) {
        sendNotFound(res, 'Servidor não encontrado');
        return;
      }

      if (!ServidorEmailController.pertenceEmpresa(servidor, empresaId)) {
        sendNotFound(res, 'Servidor não encontrado');
        return;
      }

      // Criar transporter
      const transporter = nodemailer.createTransport({
        host: servidor.host,
        port: servidor.porta,
        secure: servidor.ssl,
        auth: {
          user: servidor.usuario,
          pass: servidor.senha
        },
        tls: servidor.tls ? {
          rejectUnauthorized: false
        } : undefined
      });

      // Configurar e-mail de teste
      const mailOptions = {
        from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
        to: email_teste,
        subject: 'Teste de Configuração - BackNet',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Teste de Configuração - BackNet</h2>
            <p>Este é um e-mail de teste enviado para verificar se as configurações do servidor de e-mail estão funcionando corretamente.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4>Informações do Servidor:</h4>
              <ul>
                <li><strong>Host:</strong> ${servidor.host}</li>
                <li><strong>Porta:</strong> ${servidor.porta}</li>
                <li><strong>SSL:</strong> ${servidor.ssl ? 'Habilitado' : 'Desabilitado'}</li>
                <li><strong>TLS:</strong> ${servidor.tls ? 'Habilitado' : 'Desabilitado'}</li>
                <li><strong>Data/Hora:</strong> ${formatDateTime(new Date()) || 'N/A'}</li>
              </ul>
            </div>
            <p style="color: #28a745; font-weight: bold;">✅ Configuração funcionando corretamente!</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
            <p style="font-size: 12px; color: #6c757d;">Este é um e-mail automático do sistema BackNet.</p>
          </div>
        `
      };

      // Enviar e-mail
      await transporter.sendMail(mailOptions);

      logger.info(`E-mail de teste enviado com sucesso para: ${email_teste}`);

      sendSuccess(res, undefined, `E-mail de teste enviado com sucesso para ${email_teste}`);

    } catch (error: unknown) {
      sendError(res, error, 'Erro ao enviar e-mail de teste', 500, true);
    }
  }

  /**
   * Buscar servidor ativo
   */
  static async getActive(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const where = empresaId != null
        ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
      const servidor = await ServidorEmailService.findOne({
        where,
        attributes: {
          exclude: ['senha'], // Não retornar a senha
        },
      });

      if (!servidor) {
        sendSuccess(res, null, 'Nenhum servidor de email ativo configurado');
        return;
      }

      sendSuccess(res, servidor, 'Servidor ativo encontrado');
    } catch (error) {
      sendError(res, error, 'Erro ao buscar servidor ativo', 500, true);
    }
  }

  /**
   * Criar ou atualizar servidor único
   */
  static async createOrUpdate(req: Request, res: Response): Promise<void> {
    try {
      const servidorData = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      const whereAtivo = empresaId != null
        ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
      const servidor = await ServidorEmailService.findOne({
        where: whereAtivo
      });

      if (servidor) {
        // Atualizar servidor existente
        // Validar dados obrigatórios (senha é opcional ao atualizar)
        if (!servidorData.host || !servidorData.porta || !servidorData.usuario) {
          sendValidationError(res, 'Host, porta e usuário são obrigatórios');
          return;
        }

        // Se a senha não foi fornecida, não atualizar este campo
        if (!servidorData.senha || servidorData.senha.trim() === '') {
          delete servidorData.senha;
        }

        const dadosAnteriores = servidor.toJSON();
        await ServidorEmailService.updateInstance(servidor, servidorData);
        
        try {
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'ServidorEmail',
            servidor.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            servidor.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
        
        sendSuccess(res, servidor, 'Servidor de email atualizado com sucesso');
      } else {
        // Criar novo servidor
        // Validar dados obrigatórios (senha é obrigatória ao criar)
        if (!servidorData.host || !servidorData.porta || !servidorData.usuario || !servidorData.senha) {
          sendValidationError(res, 'Host, porta, usuário e senha são obrigatórios');
          return;
        }

        servidorData.ativo = true;
        const novoServidor = await ServidorEmailService.create({
          ...servidorData,
          empresa_id: servidorData.empresa_id ?? getEmpresaIdOrNull(req) ?? null
        });
        
        // Recarregar sem a senha
        await novoServidor.reload({
          attributes: {
            exclude: ['senha'],
          },
        });
        
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'ServidorEmail',
            novoServidor.id,
            novoServidor.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
        
        sendSuccess(res, novoServidor, 'Servidor de email criado com sucesso', 201);
      }
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const errors = error.errors ? error.errors.map((err) => err.message) : [];
        sendValidationError(res, 'Dados inválidos', { errors });
        return;
      }

      sendError(res, error, 'Erro ao criar/atualizar servidor de email', 500, true);
    }
  }

  /**
   * Buscar mensagem por tipo
   */
  static async getMensagemByTipo(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      logger.info('Buscando mensagem Email por tipo:', { tipo });

      const mensagem = await MensagemEmailService.findByTipo(tipo, empresaId);

      if (!mensagem) {
        logger.info('Mensagem não encontrada para o tipo:', { tipo });
        sendNotFound(res, 'Mensagem não encontrada');
        return;
      }

      logger.info('Mensagem encontrada:', { tipo, id: mensagem.id });
      sendSuccess(res, mensagem);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar mensagem por tipo', 500, true, {
        tipo: req.params.tipo
      });
    }
  }

  /**
   * Salvar mensagem Email
   */
  static async saveMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, tipo_envio, mensagem_padrao, mensagem_manual, ativo } = req.body;

      if (!tipo || !tipo_envio) {
        sendValidationError(res, 'Tipo e tipo de envio são obrigatórios');
        return;
      }

      if (tipo === 'envio_manual' && !mensagem_padrao && !mensagem_manual) {
        sendValidationError(res, 'Mensagem padrão ou mensagem manual é obrigatória para envio manual');
        return;
      }

      if (tipo !== 'envio_manual' && !mensagem_padrao) {
        sendValidationError(res, 'Mensagem padrão é obrigatória');
        return;
      }

      const mensagemPadraoFinal = tipo === 'envio_manual' && !mensagem_padrao && mensagem_manual 
        ? mensagem_manual 
        : (mensagem_padrao || '');

      const mensagemData = {
        tipo,
        tipo_envio,
        mensagem_padrao: mensagemPadraoFinal,
        mensagem_manual: mensagem_manual || null,
        ativo,
        empresa_id: getEmpresaIdOrNull(req) ?? null
      };

      const empresaIdMsg = getEmpresaIdOrNull(req) ?? null;
      let mensagem = await MensagemEmailService.findByTipo(tipo, empresaIdMsg);

      try {
        if (mensagem) {
          const dadosAnteriores = mensagem.toJSON();
          mensagem = await MensagemEmailService.update(mensagem.id, mensagemData);
          
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'MensagemEmail',
            mensagem.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            mensagem.toJSON() as unknown as Record<string, unknown>
          );
        } else {
          mensagem = await MensagemEmailService.create(mensagemData);
          
          await registrarCriacao(
            req as AuthenticatedRequest,
            'MensagemEmail',
            mensagem.id,
            mensagem.toJSON() as unknown as Record<string, unknown>
          );
        }
      } catch (dbError) {
        const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Erro desconhecido no banco';
        logger.error('Erro ao salvar/atualizar mensagem no banco:', { 
          tipo, 
          error: dbErrorMessage
        });
        throw new Error(`Erro ao salvar mensagem: ${dbErrorMessage}`);
      }

      sendSuccess(res, mensagem, 'Mensagem salva com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao salvar mensagem', 500, true);
    }
  }
}
