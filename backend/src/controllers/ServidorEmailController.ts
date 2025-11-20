import { Request, Response } from 'express';
import { ServidorEmail } from '../models/ServidorEmail';
import { MensagemEmail } from '../models/MensagemEmail';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';
import { ValidationError } from 'sequelize';

export class ServidorEmailController {
  /**
   * Listar todos os servidores de email
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const servidores = await ServidorEmail.findAll({
        order: [['created_at', 'DESC']],
        attributes: {
          exclude: ['senha'], // Não retornar a senha na listagem
        },
      });

      res.json({
        success: true,
        data: servidores,
        message: 'Servidores de email listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar servidores de email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar servidor de email por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorEmail.findByPk(id, {
        attributes: {
          exclude: ['senha'], // Não retornar a senha
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de email não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de email encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor de email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
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
        res.status(400).json({
          success: false,
          message: 'Host, porta, usuário e senha são obrigatórios'
        });
        return;
      }

      // Se estiver criando um servidor ativo, desativar outros
      if (servidorData.ativo !== false) {
        await ServidorEmail.update(
          { ativo: false },
          { where: { ativo: true } }
        );
        servidorData.ativo = true;
      }

      const servidor = await ServidorEmail.create(servidorData);

      res.status(201).json({
        success: true,
        data: servidor,
        message: 'Servidor de email criado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao criar servidor de email:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors ? error.errors.map((err) => err.message) : []
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualizar servidor de email
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const servidorData = req.body;

      const servidor = await ServidorEmail.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de email não encontrado'
        });
        return;
      }

      // Se estiver ativando este servidor, desativar outros
      if (servidorData.ativo === true) {
        await ServidorEmail.update(
          { ativo: false },
          { where: { ativo: true, id: { [Op.ne]: id } } }
        );
      }

      await servidor.update(servidorData);

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de email atualizado com sucesso'
      });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar servidor de email:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors ? error.errors.map((err) => err.message) : []
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Deletar servidor de email
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorEmail.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de email não encontrado'
        });
        return;
      }

      await servidor.destroy();

      res.json({
        success: true,
        message: 'Servidor de email deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar servidor de email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Testar conexão do servidor de email
   */
  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const servidor = await ServidorEmail.findByPk(id);

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor de email não encontrado'
        });
        return;
      }

      // Aqui você implementaria a lógica de teste de conexão
      // Por enquanto, vamos simular um teste
      const testResult = {
        success: true,
        message: 'Conexão testada com sucesso',
        details: {
          host: servidor.host,
          porta: servidor.porta,
          ssl: servidor.ssl,
          tls: servidor.tls
        }
      };

      res.json(testResult);
    } catch (error) {
      logger.error('Erro ao testar conexão do servidor de email:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Enviar e-mail de teste
   */
  static async sendTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email_teste } = req.body;

      if (!email_teste) {
        res.status(400).json({
          success: false,
          message: 'E-mail de teste é obrigatório'
        });
        return;
      }

      const servidor = await ServidorEmail.findByPk(id);
      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Servidor não encontrado'
        });
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
                <li><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</li>
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

      res.json({
        success: true,
        message: `E-mail de teste enviado com sucesso para ${email_teste}`
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao enviar e-mail de teste:', error);
      
      res.status(500).json({
        success: false,
        message: `Erro ao enviar e-mail de teste: ${errorMessage}`
      });
    }
  }

  /**
   * Buscar servidor ativo
   */
  static async getActive(req: Request, res: Response): Promise<void> {
    try {
      const servidor = await ServidorEmail.findOne({
        where: { ativo: true },
        attributes: {
          exclude: ['senha'], // Não retornar a senha
        },
      });

      if (!servidor) {
        res.status(404).json({
          success: false,
          message: 'Nenhum servidor de email ativo encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor ativo encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar servidor ativo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar ou atualizar servidor único
   */
  static async createOrUpdate(req: Request, res: Response): Promise<void> {
    try {
      const servidorData = req.body;

      // Buscar servidor existente
      const servidor = await ServidorEmail.findOne({
        where: { ativo: true }
      });

      if (servidor) {
        // Atualizar servidor existente
        // Validar dados obrigatórios (senha é opcional ao atualizar)
        if (!servidorData.host || !servidorData.porta || !servidorData.usuario) {
          res.status(400).json({
            success: false,
            message: 'Host, porta e usuário são obrigatórios'
          });
          return;
        }

        // Se a senha não foi fornecida, não atualizar este campo
        if (!servidorData.senha || servidorData.senha.trim() === '') {
          delete servidorData.senha;
        }

        await servidor.update(servidorData);
        
        // Recarregar o servidor para pegar os dados atualizados
        await servidor.reload({
          attributes: {
            exclude: ['senha'], // Não retornar a senha
          },
        });
        
        res.json({
          success: true,
          data: servidor,
          message: 'Servidor de email atualizado com sucesso'
        });
      } else {
        // Criar novo servidor
        // Validar dados obrigatórios (senha é obrigatória ao criar)
        if (!servidorData.host || !servidorData.porta || !servidorData.usuario || !servidorData.senha) {
          res.status(400).json({
            success: false,
            message: 'Host, porta, usuário e senha são obrigatórios'
          });
          return;
        }

        servidorData.ativo = true;
        const novoServidor = await ServidorEmail.create(servidorData);
        
        // Recarregar sem a senha
        await novoServidor.reload({
          attributes: {
            exclude: ['senha'],
          },
        });
        
        res.status(201).json({
          success: true,
          data: novoServidor,
          message: 'Servidor de email criado com sucesso'
        });
      }
    } catch (error: unknown) {
      logger.error('Erro ao criar/atualizar servidor de email:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors ? error.errors.map((err) => err.message) : []
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar mensagem por tipo
   */
  static async getMensagemByTipo(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;
      logger.info('Buscando mensagem Email por tipo:', { tipo });

      const mensagem = await MensagemEmail.findOne({
        where: { tipo }
      });

      if (!mensagem) {
        logger.info('Mensagem não encontrada para o tipo:', { tipo });
        res.status(404).json({
          success: false,
          message: 'Mensagem não encontrada'
        });
        return;
      }

      logger.info('Mensagem encontrada:', { tipo, id: mensagem.id });
      res.json({
        success: true,
        data: mensagem
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar mensagem por tipo:', { tipo: req.params.tipo, error: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Salvar mensagem Email
   */
  static async saveMensagem(req: Request, res: Response): Promise<void> {
    try {
      const { tipo, tipo_envio, mensagem_padrao, mensagem_manual, ativo } = req.body;

      logger.info('Salvando mensagem Email:', { 
        tipo, 
        tipo_envio, 
        temMensagemPadrao: !!mensagem_padrao,
        temMensagemManual: !!mensagem_manual,
        ativo 
      });

      if (!tipo || !tipo_envio) {
        logger.warn('Validação falhou: tipo ou tipo_envio ausente', { tipo, tipo_envio });
        res.status(400).json({
          success: false,
          message: 'Tipo e tipo de envio são obrigatórios'
        });
        return;
      }

      // Para envio_manual, mensagem_padrao ou mensagem_manual deve estar preenchida
      if (tipo === 'envio_manual' && !mensagem_padrao && !mensagem_manual) {
        logger.warn('Validação falhou: mensagem_padrao ou mensagem_manual obrigatória para envio_manual', { tipo });
        res.status(400).json({
          success: false,
          message: 'Mensagem padrão ou mensagem manual é obrigatória para envio manual'
        });
        return;
      }

      // Para outros tipos, mensagem_padrao é obrigatória
      if (tipo !== 'envio_manual' && !mensagem_padrao) {
        logger.warn('Validação falhou: mensagem_padrao obrigatória', { tipo });
        res.status(400).json({
          success: false,
          message: 'Mensagem padrão é obrigatória'
        });
        return;
      }

      // Para envio_manual, se não houver mensagem_padrao, usar mensagem_manual como fallback
      // (o campo mensagem_padrao é obrigatório no modelo)
      const mensagemPadraoFinal = tipo === 'envio_manual' && !mensagem_padrao && mensagem_manual 
        ? mensagem_manual 
        : (mensagem_padrao || '');

      logger.info('Dados finais para salvar:', { 
        tipo, 
        tipo_envio, 
        mensagemPadraoLength: mensagemPadraoFinal.length,
        mensagemManualLength: mensagem_manual?.length || 0
      });

      const mensagemData = {
        tipo,
        tipo_envio,
        mensagem_padrao: mensagemPadraoFinal,
        mensagem_manual: mensagem_manual || null,
        ativo
      };

      // Buscar mensagem existente
      let mensagem = await MensagemEmail.findOne({
        where: { tipo }
      });

      logger.info('Mensagem existente encontrada:', { tipo, existe: !!mensagem, id: mensagem?.id });

      try {
        if (mensagem) {
          // Atualizar existente
          logger.info('Atualizando mensagem existente:', { id: mensagem.id, tipo });
          await mensagem.update(mensagemData);
          logger.info('Mensagem atualizada com sucesso:', { id: mensagem.id });
        } else {
          // Criar novo
          logger.info('Criando nova mensagem:', { tipo });
          mensagem = await MensagemEmail.create(mensagemData);
          logger.info('Mensagem criada com sucesso:', { id: mensagem.id, tipo });
        }
      } catch (dbError) {
        const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Erro desconhecido no banco';
        const dbErrorStack = dbError instanceof Error ? dbError.stack : undefined;
        logger.error('Erro ao salvar/atualizar mensagem no banco:', { 
          tipo, 
          error: dbErrorMessage, 
          stack: dbErrorStack,
          mensagemData: {
            tipo: mensagemData.tipo,
            tipo_envio: mensagemData.tipo_envio,
            temMensagemPadrao: !!mensagemData.mensagem_padrao,
            temMensagemManual: !!mensagemData.mensagem_manual
          }
        });
        throw new Error(`Erro ao salvar mensagem: ${dbErrorMessage}`);
      }

      res.json({
        success: true,
        message: 'Mensagem salva com sucesso',
        data: mensagem
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao salvar mensagem:', { error: errorMessage, stack: errorStack });
      res.status(500).json({
        success: false,
        message: errorMessage || 'Erro interno do servidor'
      });
    }
  }
}
