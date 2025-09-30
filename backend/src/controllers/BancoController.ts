import { Request, Response } from 'express';
import { Banco } from '../models/Banco';
import { BancoApiService } from '../services/BancoApiService';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export class BancoController {
  /**
   * Listar bancos com filtros
   */
  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const bancos = await Banco.findAll({
        where: { ativo: true },
        include: [
          { association: 'titulos' },
          { association: 'clientes' }
        ],
        order: [['nome', 'ASC']]
      });

      res.json({
        success: true,
        data: bancos
      });
    } catch (error: any) {
      logger.error('Erro ao buscar bancos ativos', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { search, status, tipo_banco, page = 1, limit = 15 } = req.query;
      
      const where: any = {};
      
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
        where.tipo_banco = tipo_banco;
      }
      
      const offset = (Number(page) - 1) * Number(limit);
      
      const { count, rows: bancos } = await Banco.findAndCountAll({
        where,
        order: [['nome', 'ASC']],
        limit: Number(limit),
        offset,
        include: [
          { association: 'titulos' },
          { association: 'clientes' }
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
    } catch (error: any) {
      logger.error('Erro ao listar bancos', {
        error: error.message
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
          { association: 'titulos' },
          { association: 'clientes' }
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
    } catch (error: any) {
      logger.error('Erro ao buscar banco', {
        banco_id: req.params.id,
        error: error.message
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
    } catch (error: any) {
      logger.error('Erro ao criar banco', {
        error: error.message
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
      
      logger.info('Banco atualizado com sucesso', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco
      });
      
      res.json({
        success: true,
        message: 'Banco atualizado com sucesso!',
        data: banco
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar banco', {
        banco_id: req.params.id,
        error: error.message
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
    } catch (error: any) {
      logger.error('Erro ao deletar banco', {
        banco_id: req.params.id,
        error: error.message
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
      
      const banco = await Banco.findByPk(id);
      
      if (!banco) {
        res.status(404).json({ error: 'Banco não encontrado' });
        return;
      }
      
      logger.info('Testando conexão com banco', {
        banco_id: banco.id,
        nome: banco.nome,
        tipo_banco: banco.tipo_banco
      });
      
      const resultado = await BancoApiService.testarAutenticacao(banco);
      
      if (resultado.success) {
        res.json({
          success: true,
          message: 'Conexão com a API do banco realizada com sucesso!'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Falha na conexão: ' + resultado.message
        });
      }
    } catch (error: any) {
      logger.error('Erro ao testar conexão', {
        banco_id: req.params.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + error.message
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
    } catch (error: any) {
      logger.error('Erro ao buscar dados da API', {
        banco_id: req.params.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + error.message
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
        const config = require(configPath);
        
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
      } catch (importError) {
        res.status(404).json({
          success: false,
          message: 'Configurações do banco não encontradas'
        });
      }
    } catch (error: any) {
      logger.error('Erro ao buscar URL padrão', {
        tipo_banco: req.params.tipoBanco,
        error: error.message
      });
      res.status(500).json({
        success: false,
        message: 'Erro interno: ' + error.message
      });
    }
  }
}