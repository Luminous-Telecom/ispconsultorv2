import { Request, Response } from 'express';
import { Banco } from '../../../models/cadastros/Banco';
import { BancoApiService } from '../../../services/bancos/BancoApiService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { logger } from '../../../utils/logger';
import { ValidationError } from 'sequelize';
import { randomBytes } from 'crypto';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { setAuditData } from '../../../middleware/auditMiddleware';

export class BancoController {
  /**
   * Listar bancos com filtros
   */
  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const result = await BancoService.findAtivos();
      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar bancos ativos', { error: errorMessage });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { search, status, tipo_banco, page = 1, limit = 15 } = req.query;
      
      const result = await BancoService.list({
        search: search as string | undefined,
        status: status as string | undefined,
        tipo_banco: tipo_banco as string | undefined,
        page: Number(page),
        limit: Number(limit)
      });
      
      res.json(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao listar bancos', {
        error: errorMessage
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Buscar banco por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      res.json({
        success: true,
        data: banco
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar banco', {
        banco_id: req.params.id,
        error: errorMessage
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Criar novo banco
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const dadosBanco = req.body;
      
      // Validações básicas
      if (!dadosBanco.nome) {
        res.status(400).json({ error: 'Nome do banco é obrigatório' });
        return;
      }
      
      if (!dadosBanco.tipo_banco) {
        res.status(400).json({ error: 'Tipo do banco é obrigatório' });
        return;
      }
      
      // Verificar se já existe banco com mesmo nome
      const bancoExistente = await BancoService.existsByName(dadosBanco.nome);
      
      if (bancoExistente) {
        res.status(400).json({ error: 'Já existe um banco com este nome' });
        return;
      }
      
      const banco = await BancoService.create(dadosBanco);
      
      // Registrar auditoria
      await registrarCriacao(
        req,
        'Banco',
        banco.id,
        banco.toJSON() as Record<string, unknown>
      );
      
      logger.info('Banco criado com sucesso', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco
      });
      
      res.status(201).json({
        success: true,
        message: 'Banco cadastrado com sucesso!',
        data: banco
      });
    } catch (error: unknown) {
      // Capturar erros de validação do Sequelize
      if (error instanceof ValidationError) {
        const errorMessages = error.errors.map(err => err.message);
        logger.warn('Erro de validação ao criar banco', {
          errors: errorMessages,
          body: req.body
        });
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: errorMessages.join(', ')
        });
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar banco', {
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  /**
   * Atualizar banco
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dadosBanco = req.body;
      
      logger.info('Atualizando banco - dados recebidos', {
        banco_id: id,
        has_client_id_producao: !!dadosBanco.client_id_producao,
        has_client_secret_producao: !!dadosBanco.client_secret_producao,
        client_id_length: dadosBanco.client_id_producao?.length || 0,
        client_secret_length: dadosBanco.client_secret_producao?.length || 0
      });
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = banco.toJSON() as Record<string, unknown>;
      
      // Verificar se já existe outro banco com mesmo nome
      if (dadosBanco.nome && dadosBanco.nome !== banco.nome) {
        const bancoExistente = await BancoService.existsByName(dadosBanco.nome, banco.id);
        
        if (bancoExistente) {
          res.status(400).json({ error: 'Já existe um banco com este nome' });
          return;
        }
      }
      
      // Preparar dados para atualização
      // Remover campos sensíveis que não foram enviados para não sobrescrever valores existentes
      const dadosParaAtualizar: Record<string, unknown> = { ...dadosBanco };
      
      // Campos sensíveis que devem ser preservados se não enviados
      const camposSensiveis = [
        'api_key',
        'api_secret',
        'client_id_producao',
        'client_secret_producao',
        'webhook_secret'
      ];
      
      // Preservar também identificador_conta que pode ser sensível
      if (!('identificador_conta' in dadosBanco) || dadosBanco.identificador_conta === null || dadosBanco.identificador_conta === '') {
        delete dadosParaAtualizar.identificador_conta;
      }
      
      // Se um campo sensível não foi enviado no body, manter o valor atual
      for (const campo of camposSensiveis) {
        // Se o campo não está presente no body (undefined), não incluir na atualização
        // Isso preserva o valor existente no banco
        if (!(campo in dadosBanco)) {
          delete dadosParaAtualizar[campo];
        } else if (dadosBanco[campo] === null || dadosBanco[campo] === '') {
          // Se o campo foi enviado como null ou string vazia, também remover para preservar
          delete dadosParaAtualizar[campo];
        }
      }
      
      // Remover campos auxiliares que não devem ser salvos
      delete dadosParaAtualizar.has_api_key;
      delete dadosParaAtualizar.has_api_secret;
      delete dadosParaAtualizar.has_client_secret_producao;
      
      const bancoAtualizado = await BancoService.update(id, dadosParaAtualizar);
      
      // Registrar auditoria
      const dadosNovos = bancoAtualizado.toJSON() as Record<string, unknown>;
      
      // Disponibilizar dados para o middleware
      setAuditData(req, dadosAnteriores, dadosNovos);
      
      await registrarAtualizacao(
        req,
        'Banco',
        bancoAtualizado.id,
        dadosAnteriores,
        dadosNovos
      );
      
      logger.info('Banco atualizado com sucesso', {
        banco_id: bancoAtualizado.id,
        nome: bancoAtualizado.nome,
        tipo_banco: bancoAtualizado.tipo_banco,
        has_client_id_after: !!bancoAtualizado.client_id_producao,
        has_client_secret_after: !!bancoAtualizado.client_secret_producao
      });
      
      res.json({
        success: true,
        message: 'Banco atualizado com sucesso!',
        data: bancoAtualizado
      });
    } catch (error: unknown) {
      // Capturar erros de validação do Sequelize
      if (error instanceof ValidationError) {
        const errorMessages = error.errors.map(err => err.message);
        logger.warn('Erro de validação ao atualizar banco', {
          banco_id: req.params.id,
          errors: errorMessages,
          body: req.body
        });
        res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          message: errorMessages.join(', ')
        });
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar banco', {
        banco_id: req.params.id,
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  /**
   * Deletar banco
   */
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Buscar banco antes de deletar para auditoria
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      // Capturar dados anteriores para auditoria
      const dadosAnteriores = banco.toJSON() as Record<string, unknown>;
      
      try {
        await BancoService.delete(id);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (errorMessage.includes('títulos associados')) {
          res.status(400).json({ 
            error: 'Não é possível excluir banco com títulos associados.' 
          });
          return;
        }
        throw error;
      }
      
      // Registrar auditoria
      await registrarExclusao(
        req,
        'Banco',
        banco.id,
        dadosAnteriores
      );
      
      logger.info('Banco excluído com sucesso', {
        banco_id: id,
        nome: banco.nome
      });
      
      res.json({
        success: true,
        message: 'Banco excluído com sucesso!'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao deletar banco', {
        banco_id: req.params.id,
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Testar conexão com a API do banco
   */
  static async testarConexao(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        res.status(404).json({ 
          success: false,
          message: 'Banco não encontrado' 
        });
        return;
      }
      
      logger.info('Testando conexão com banco', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco,
        has_client_id: !!banco.client_id_producao,
        has_client_secret: !!banco.client_secret_producao
      });
      
      const resultado = await BancoApiService.testarAutenticacao(banco);
      
      if (resultado.success) {
        res.json({
          success: true,
          message: resultado.message || 'Conexão com a API do banco realizada com sucesso!'
        });
      } else {
        res.status(400).json({
          success: false,
          message: resultado.message || 'Falha na conexão'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao testar conexão', {
        banco_id: req.params.id,
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + errorMessage
      });
    }
  }

  /**
   * Buscar dados da conta via API
   */
  static async buscarDadosApi(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await BancoService.getById(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      // EFI Bank não fornece dados da conta via API pública
      // Retornar mensagem explicativa
      res.json({
        success: false,
        message: 'Busca automática de dados não disponível para este banco. Configure manualmente.'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar dados da API', {
        banco_id: req.params.id,
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + errorMessage
      });
    }
  }

  static async gerarWebhookSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const banco = await BancoService.getById(id);

      if (!banco) {
        res.status(404).json({
          success: false,
          message: 'Banco não encontrado'
        });
        return;
      }

      if (banco.tipo_banco !== 'asaas') {
        res.status(400).json({
          success: false,
          message: 'Webhook secret disponível apenas para bancos do tipo Asaas'
        });
        return;
      }

      const novoSecret = randomBytes(32).toString('hex');
      await BancoService.update(id, { webhook_secret: novoSecret });

      logger.info('Webhook secret Asaas gerado manualmente', {
        banco_id: banco.id
      });

      res.json({
        success: true,
        message: 'Webhook secret gerado com sucesso',
        data: {
          webhook_secret: novoSecret
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao gerar webhook secret', {
        banco_id: req.params.id,
        error: errorMessage
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno ao gerar webhook secret'
      });
    }
  }

  /**
   * Buscar URL padrão para tipo de banco
   */
  static async urlPadrao(req: Request, res: Response): Promise<void> {
    try {
      const { tipoBanco } = req.params;
      
      // Importar configuração do banco
      const configPath = `../config/bancos/${tipoBanco}`;
      
      try {
        const config = await import(configPath);
        
        if (!config || !config.default) {
          res.status(404).json({
            success: false,
            message: 'Configurações do banco não encontradas'
          });
          return;
        }
        
        const bancoConfig = config.default;
        const url = bancoConfig.api_url || null;
        
        res.json({
          success: true,
          url: url
        });
      } catch {
        res.status(404).json({
          success: false,
          message: 'Configurações do banco não encontradas'
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar URL padrão', {
        tipo_banco: req.params.tipoBanco,
        error: errorMessage
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + errorMessage
      });
    }
  }
}