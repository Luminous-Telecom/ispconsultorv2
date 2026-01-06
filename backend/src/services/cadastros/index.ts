import { ClienteArquivo } from '../../models/clientes/ClienteArquivo';
import { Cliente } from '../../models/clientes/Cliente';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../../utils/logger';

export interface CreateClienteArquivoData {
  cliente_id: number;
  nome: string;
  tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
  arquivo: Express.Multer.File;
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
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'arquivos', 'clientes');

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
   * Converte Buffer para arquivo temporário
   */
  private static async bufferToTempFile(buffer: Buffer, nome: string, mimeType: string): Promise<Express.Multer.File> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer inválido ou vazio');
    }

    const tempDir = os.tmpdir();
    const ext = path.extname(nome) || (mimeType === 'application/pdf' ? '.pdf' : '');
    const baseName = path.basename(nome, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    const tempFileName = `${baseName}_${Date.now()}${ext}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    await fs.writeFile(tempFilePath, buffer);
    
    return {
      fieldname: 'arquivo',
      originalname: nome,
      encoding: '7bit',
      mimetype: mimeType,
      destination: tempDir,
      filename: tempFileName,
      path: tempFilePath,
      size: buffer.length
    } as Express.Multer.File;
  }

  /**
   * Converte base64 para arquivo temporário (para compatibilidade com código legado)
   */
  private static async base64ToTempFile(base64Data: string, nome: string, mimeType: string): Promise<Express.Multer.File> {
    const base64Content = base64Data.replace(/^data:.*,/, '');
    
    if (!base64Content || base64Content.trim() === '') {
      throw new Error('Conteúdo base64 inválido ou vazio');
    }

    const buffer = Buffer.from(base64Content, 'base64');
    return this.bufferToTempFile(buffer, nome, mimeType);
  }

  /**
   * Cria arquivo a partir de Buffer (método direto para PDFs binários)
   */
  static async createFromBuffer(data: {
    cliente_id: number;
    nome: string;
    tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
    arquivo_buffer: Buffer;
    mime_type?: string;
    descricao?: string;
    origem?: 'manual' | 'assinatura_digital' | 'sistema';
    referencia_id?: number;
    referencia_tipo?: string;
  }): Promise<ClienteArquivo> {
    // Converter Buffer para arquivo temporário
    const tempFile = await this.bufferToTempFile(
      data.arquivo_buffer,
      data.nome,
      data.mime_type || 'application/octet-stream'
    );
    
    // Usar o método create normal
    return this.create({
      cliente_id: data.cliente_id,
      nome: data.nome,
      tipo: data.tipo,
      arquivo: tempFile,
      mime_type: data.mime_type,
      descricao: data.descricao,
      origem: data.origem,
      referencia_id: data.referencia_id,
      referencia_tipo: data.referencia_tipo
    });
  }

  /**
   * Cria arquivo a partir de base64 (método auxiliar para compatibilidade)
   */
  static async createFromBase64(data: {
    cliente_id: number;
    nome: string;
    tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
    arquivo_base64: string;
    mime_type?: string;
    descricao?: string;
    origem?: 'manual' | 'assinatura_digital' | 'sistema';
    referencia_id?: number;
    referencia_tipo?: string;
  }): Promise<ClienteArquivo> {
    // Converter base64 para arquivo temporário
    const tempFile = await this.base64ToTempFile(
      data.arquivo_base64,
      data.nome,
      data.mime_type || 'application/octet-stream'
    );
    
    // Usar o método create normal
    return this.create({
      cliente_id: data.cliente_id,
      nome: data.nome,
      tipo: data.tipo,
      arquivo: tempFile,
      mime_type: data.mime_type,
      descricao: data.descricao,
      origem: data.origem,
      referencia_id: data.referencia_id,
      referencia_tipo: data.referencia_tipo
    });
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
    try {
      // Verificar se o cliente existe
      const cliente = await Cliente.findByPk(data.cliente_id);
      if (!cliente) {
        throw new Error(`Cliente com ID ${data.cliente_id} não encontrado`);
      }

      // Validar arquivo
      if (!data.arquivo) {
        throw new Error('Arquivo é obrigatório');
      }

      // O multer já salvou o arquivo no diretório correto
      const clienteDir = path.join(this.UPLOAD_DIR, String(data.cliente_id));
      const fileName = path.basename(data.arquivo.path);
      const destinoPath = path.join(clienteDir, fileName);
      
      // Se não estiver no diretório do cliente, copiar e depois deletar o original
      if (!data.arquivo.path.startsWith(clienteDir)) {
        await this.ensureUploadDir();
        await fs.mkdir(clienteDir, { recursive: true });
        
        // Usar copyFile ao invés de rename para evitar erro EXDEV (cross-device link)
        // Isso é necessário quando o arquivo temporário está em /tmp e o destino em outro sistema de arquivos
        try {
          await fs.copyFile(data.arquivo.path, destinoPath);
          // Tentar deletar o arquivo temporário (não crítico se falhar)
          try {
            await fs.unlink(data.arquivo.path);
          } catch (unlinkError) {
            logger.warn('Não foi possível deletar arquivo temporário', {
              tempPath: data.arquivo.path,
              error: unlinkError instanceof Error ? unlinkError.message : 'Erro desconhecido'
            });
          }
        } catch (copyError) {
          logger.error('Erro ao copiar arquivo', {
            origem: data.arquivo.path,
            destino: destinoPath,
            error: copyError instanceof Error ? copyError.message : 'Erro desconhecido'
          });
          throw copyError;
        }
      }
      
      const caminho = path.join(String(data.cliente_id), fileName);
      
      // Obter tamanho do arquivo
      const tamanho = data.arquivo.size;
      
      return await ClienteArquivo.create({
        cliente_id: data.cliente_id,
        nome: data.nome,
        tipo: data.tipo,
        caminho,
        tamanho,
        mime_type: data.mime_type || data.arquivo.mimetype || null,
        descricao: data.descricao || null,
        origem: data.origem || 'manual',
        referencia_id: data.referencia_id || null,
        referencia_tipo: data.referencia_tipo || null
      });
    } catch (error) {
      logger.error('Erro ao criar arquivo do cliente', {
        cliente_id: data.cliente_id,
        nome: data.nome,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
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
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      logger.error('Erro ao ler arquivo do sistema de arquivos', {
        id,
        caminho: arquivo.caminho,
        filePath,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      throw new Error(`Arquivo não encontrado no sistema de arquivos: ${arquivo.caminho}`);
    }
  }
}
