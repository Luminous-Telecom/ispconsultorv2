import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';
import { Op, WhereOptions } from 'sequelize';
import { randomBytes } from 'crypto';
import { cache } from '../utils/cache';

export class BancoController {
  /**
   * Listar bancos com filtros
   */
  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      // Cache para bancos ativos (dados raramente mudam)
      const cacheKey = 'bancos:ativos';
      const cached = cache.get(cacheKey);
      
      if (cached) {
        res.json(cached);
        return;
      }

      const bancos = await Banco.findAll({
        where: { ativo: true },
        include: [
          { association: 'titulos' }
        ],
        order: [['nome', 'ASC']]
      });

      const response = {
        success: true,
        data: bancos
      };

      // Cachear por 10 minutos (bancos raramente mudam)
      cache.set(cacheKey, response, 600000);

      res.json(response);
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
      
      const where: WhereOptions<Banco> = {};
      
      // Filtro por busca
      if (search) {
        where.nome = {
          [Op.like]: `%${search}%`
        };
      }
      
      // Filtro por status
      if (status) {
        where.ativo = status === 'ativo';
      }
      
      // Filtro por tipo de banco
      if (tipo_banco) {
        where.tipo_banco = tipo_banco as 'efi' | 'asaas' | 'bancario' | 'outros';
      }
      
      const offset = (Number(page) - 1) * Number(limit);
      
      // Contar total de bancos sem includes para evitar duplicatas
      const count = await Banco.count({ where });
      
      // Buscar bancos com includes
      const bancos = await Banco.findAll({
        where,
        order: [['id', 'DESC']], // Maior ID para o menor
        limit: Number(limit),
        offset,
        include: [
          { association: 'titulos' }
        ]
      });
      
      res.json({
        success: true,
        data: bancos,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total: count,
          last_page: Math.ceil(count / Number(limit)),
          from: offset + 1,
          to: Math.min(offset + Number(limit), count)
        }
      });
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
      
      const banco = await Banco.findByPk(id, {
        include: [
          { association: 'titulos' }
        ]
      });
      
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
      const bancoExistente = await Banco.findOne({
        where: { nome: dadosBanco.nome }
      });
      
      if (bancoExistente) {
        res.status(400).json({ error: 'Já existe um banco com este nome' });
        return;
      }
      
      const banco = await Banco.create(dadosBanco);
      
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
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao criar banco', {
        error: errorMessage
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
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
      
      const banco = await Banco.findByPk(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      // Verificar se já existe outro banco com mesmo nome
      if (dadosBanco.nome && dadosBanco.nome !== banco.nome) {
        const bancoExistente = await Banco.findOne({
          where: { 
            nome: dadosBanco.nome,
            id: { [Op.ne]: id }
          }
        });
        
        if (bancoExistente) {
          res.status(400).json({ error: 'Já existe um banco com este nome' });
          return;
        }
      }
      
      await banco.update(dadosBanco);
      
      // Invalidar cache de bancos ativos se o status mudou
      if (dadosBanco.ativo !== undefined) {
        cache.delete('bancos:ativos');
      }
      
      logger.info('Banco atualizado com sucesso', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco,
        has_client_id_after: !!banco.client_id_producao,
        has_client_secret_after: !!banco.client_secret_producao
      });
      
      res.json({
        success: true,
        message: 'Banco atualizado com sucesso!',
        data: banco
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar banco', {
        banco_id: req.params.id,
        error: errorMessage
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Deletar banco
   */
  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const banco = await Banco.findByPk(id, {
        include: [{ association: 'carnes' }]
      });
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      // Verificar se tem títulos associados
      const titulosCount = await banco.countTitulos();
      
      if (titulosCount > 0) {
        res.status(400).json({ 
          error: 'Não é possível excluir banco com títulos associados.' 
        });
        return;
      }
      
      await banco.destroy();
      
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
      logger.error('Erro ao deletar banco', {
        banco_id: req.params.id,
        error: errorMessage
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
      
      let banco = await Banco.findByPk(id);
      
      if (!banco) {
        res.status(404).json({ 
          success: false,
          message: 'Banco não encontrado' 
        });
        return;
      }
      
      // Recarregar banco para garantir dados atualizados
      await banco.reload();
      
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
      
      const banco = await Banco.findByPk(id);
      
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

      const banco = await Banco.findByPk(id);

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
      await banco.update({ webhook_secret: novoSecret });

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