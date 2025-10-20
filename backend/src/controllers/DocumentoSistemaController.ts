import { Request, Response } from 'express';
import { DocumentoSistema } from '../models/DocumentoSistema';
import { logger } from '../utils/logger';
import mammoth from 'mammoth';
import fs from 'fs/promises';

export class DocumentoSistemaController {
  /**
   * Listar todos os documentos do sistema
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.query;
      
      const whereClause: any = {};
      if (tipo) {
        whereClause.tipo = tipo;
      }

      const documentos = await DocumentoSistema.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: 'Documentos do sistema listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar documentos do sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento por ID
   */
  static async show(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Criar novo documento
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const documentoData = req.body;

      // Validar dados obrigatórios
      if (!documentoData.nome || !documentoData.tipo || !documentoData.conteudo) {
        res.status(400).json({
          success: false,
          message: 'Nome, tipo e conteúdo são obrigatórios'
        });
        return;
      }

      const documento = await DocumentoSistema.create(documentoData);

      res.status(201).json({
        success: true,
        data: documento,
        message: 'Documento criado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao criar documento:', error);
      
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
   * Atualizar documento
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const documentoData = req.body;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.update(documentoData);

      res.json({
        success: true,
        data: documento,
        message: 'Documento atualizado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar documento:', error);
      
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
   * Deletar documento
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const documento = await DocumentoSistema.findByPk(id);

      if (!documento) {
        res.status(404).json({
          success: false,
          message: 'Documento não encontrado'
        });
        return;
      }

      await documento.destroy();

      res.json({
        success: true,
        message: 'Documento deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar documento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documentos por tipo
   */
  static async getByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documentos = await DocumentoSistema.findAll({
        where: { tipo, ativo: true },
        order: [['nome', 'ASC']],
      });

      res.json({
        success: true,
        data: documentos,
        message: `Documentos do tipo ${tipo} listados com sucesso`
      });
    } catch (error) {
      logger.error('Erro ao buscar documentos por tipo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Buscar documento padrão por tipo
   */
  static async getDefaultByType(req: Request, res: Response): Promise<void> {
    try {
      const { tipo } = req.params;

      const documento = await DocumentoSistema.findOne({
        where: { tipo, ativo: true },
        order: [['created_at', 'ASC']], // Pega o primeiro criado como padrão
      });

      if (!documento) {
        res.status(404).json({
          success: false,
          message: `Nenhum documento padrão encontrado para o tipo ${tipo}`
        });
        return;
      }

      res.json({
        success: true,
        data: documento,
        message: 'Documento padrão encontrado'
      });
    } catch (error) {
      logger.error('Erro ao buscar documento padrão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Listar tipos de documentos disponíveis
   */
  static async getTypes(req: Request, res: Response): Promise<void> {
    try {
      const tipos = await DocumentoSistema.findAll({
        attributes: ['tipo'],
        group: ['tipo'],
        where: { ativo: true },
        order: [['tipo', 'ASC']],
      });

      const tiposList = tipos.map(doc => doc.tipo);

      res.json({
        success: true,
        data: tiposList,
        message: 'Tipos de documentos listados com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao listar tipos de documentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Converter arquivo Word para HTML
   */
  static async convertWordToHtml(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Nenhum arquivo foi enviado'
        });
        return;
      }

      const filePath = req.file.path;

      // Converter .docx para HTML usando mammoth
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      // Deletar o arquivo temporário
      await fs.unlink(filePath);

      res.json({
        success: true,
        data: { html },
        message: 'Arquivo convertido com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao converter arquivo Word:', error);
      
      // Tentar deletar o arquivo em caso de erro
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('Erro ao deletar arquivo temporário:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao converter arquivo'
      });
    }
  }
}
