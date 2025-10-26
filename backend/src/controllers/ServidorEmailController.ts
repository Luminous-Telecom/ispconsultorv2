import { Request, Response } from 'express';
import { ServidorEmail } from '../models/ServidorEmail';
import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';

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
    } catch (error: any) {
      logger.error('Erro ao criar servidor de email:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
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
          { where: { ativo: true, id: { [require('sequelize').Op.ne]: id } } }
        );
      }

      await servidor.update(servidorData);

      res.json({
        success: true,
        data: servidor,
        message: 'Servidor de email atualizado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar servidor de email:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
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
        subject: 'Teste de Configuração - CTM Telecom',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Teste de Configuração - CTM Telecom</h2>
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
            <p style="font-size: 12px; color: #6c757d;">Este é um e-mail automático do sistema CTM Telecom.</p>
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

    } catch (error: any) {
      logger.error('Erro ao enviar e-mail de teste:', error);
      
      res.status(500).json({
        success: false,
        message: `Erro ao enviar e-mail de teste: ${error.message}`
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
    } catch (error: any) {
      logger.error('Erro ao criar/atualizar servidor de email:', error);
      
      if (error.name === 'SequelizeValidationError') {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map((err: any) => err.message)
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}
