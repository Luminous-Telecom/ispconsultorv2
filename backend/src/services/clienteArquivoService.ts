import { ClienteArquivo } from '../models/ClienteArquivo';
import { Op } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export interface CreateClienteArquivoData {
  cliente_id: number;
  nome: string;
  tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
  arquivo_base64: string;
  mime_type?: string;
  descricao?: string;
  origem?: 'manual' | 'assinatura_digital' | 'sistema';
  referencia_id?: number;
  referencia_tipo?: string;
}

export interface UpdateClienteArquivoData {
  nome?: string;
  descricao?: string;
}

export class ClienteArquivoService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'clientes');

  /**
   * Garante que o diretório de upload existe
   */
  private static async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      logger.error('Erro ao criar diretório de upload', { error });
      throw new Error('Erro ao criar diretório de upload');
    }
  }

  /**
   * Salva arquivo em base64 no sistema de arquivos
   */
  private static async saveFile(base64Data: string, clienteId: number, nome: string): Promise<string> {
    await this.ensureUploadDir();
    
    // Remover prefixo data:image/... ou data:application/...
    const base64Content = base64Data.replace(/^data:.*,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Criar diretório do cliente se não existir
    const clienteDir = path.join(this.UPLOAD_DIR, String(clienteId));
    await fs.mkdir(clienteDir, { recursive: true });
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedNome = nome.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedNome}`;
    const filePath = path.join(clienteDir, fileName);
    
    await fs.writeFile(filePath, buffer);
    
    // Retornar caminho relativo (sem incluir 'clientes' pois UPLOAD_DIR já tem)
    return path.join(String(clienteId), fileName);
  }

  /**
   * Lista arquivos de um cliente
   */
  static async list(clienteId: number, filters?: { tipo?: string; origem?: string }): Promise<ClienteArquivo[]> {
    const where: any = { cliente_id: clienteId };
    
    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }
    
    if (filters?.origem) {
      where.origem = filters.origem;
    }
    
    return ClienteArquivo.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Busca arquivo por ID
   */
  static async getById(id: number): Promise<ClienteArquivo | null> {
    return ClienteArquivo.findByPk(id);
  }

  /**
   * Cria novo arquivo
   */
  static async create(data: CreateClienteArquivoData): Promise<ClienteArquivo> {
    const caminho = await this.saveFile(
      data.arquivo_base64,
      data.cliente_id,
      data.nome
    );
    
    const tamanho = Buffer.from(data.arquivo_base64.replace(/^data:.*,/, ''), 'base64').length;
    
    return ClienteArquivo.create({
      cliente_id: data.cliente_id,
      nome: data.nome,
      tipo: data.tipo,
      caminho,
      tamanho,
      mime_type: data.mime_type || null,
      descricao: data.descricao || null,
      origem: data.origem || 'manual',
      referencia_id: data.referencia_id || null,
      referencia_tipo: data.referencia_tipo || null
    });
  }

  /**
   * Atualiza arquivo
   */
  static async update(id: number, data: UpdateClienteArquivoData): Promise<ClienteArquivo> {
    const arquivo = await ClienteArquivo.findByPk(id);
    if (!arquivo) {
      throw new Error('Arquivo não encontrado');
    }
    
    await arquivo.update(data);
    return arquivo;
  }

  /**
   * Deleta arquivo
   */
  static async delete(id: number): Promise<void> {
    const arquivo = await ClienteArquivo.findByPk(id);
    if (!arquivo) {
      throw new Error('Arquivo não encontrado');
    }
    
    // Deletar arquivo físico
    try {
      const filePath = path.join(this.UPLOAD_DIR, arquivo.caminho);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Erro ao deletar arquivo físico', { id, error });
    }
    
    // Deletar registro no banco
    await arquivo.destroy();
  }

  /**
   * Obtém conteúdo do arquivo
   */
  static async getFileContent(id: number): Promise<Buffer> {
    const arquivo = await ClienteArquivo.findByPk(id);
    if (!arquivo) {
      throw new Error('Arquivo não encontrado');
    }
    
    // Construir caminho do arquivo
    // Se o caminho já começa com 'clientes/', remover para evitar duplicação
    let caminhoRelativo = arquivo.caminho;
    if (caminhoRelativo.startsWith('clientes/')) {
      caminhoRelativo = caminhoRelativo.replace(/^clientes\//, '');
    }
    
    const filePath = path.join(this.UPLOAD_DIR, caminhoRelativo);
    
    logger.info('Tentando ler arquivo', { 
      id, 
      caminhoOriginal: arquivo.caminho,
      caminhoRelativo,
      filePath,
      uploadDir: this.UPLOAD_DIR
    });
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      logger.error('Erro ao ler arquivo do sistema de arquivos', {
        id,
        caminhoOriginal: arquivo.caminho,
        caminhoRelativo,
        filePath,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw new Error(`Arquivo não encontrado no sistema de arquivos: ${arquivo.caminho}`);
    }
  }
}
