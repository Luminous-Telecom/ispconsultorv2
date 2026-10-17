import type { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../../../utils/logger';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { prisma } from '../../../db/prisma';
import { sortDirection } from '../prismaWhere';

export interface CreateClienteArquivoData {
  cliente_id: number;
  empresa_id?: number | null;
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

const SORT_COLUMNS = ['id', 'cliente_id', 'nome', 'tipo', 'tamanho', 'mime_type', 'origem', 'created_at', 'updated_at'] as const;

export class ClienteArquivoService {
  private static readonly UPLOAD_DIR = resolveArquivosPath('clientes');

  private static async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    } catch (error) {
      logger.error('Erro ao criar diretório de upload', { error });
      throw new Error('Erro ao criar diretório de upload');
    }
  }

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

  private static async base64ToTempFile(base64Data: string, nome: string, mimeType: string): Promise<Express.Multer.File> {
    const base64Content = base64Data.replace(/^data:.*,/, '');
    if (!base64Content || base64Content.trim() === '') {
      throw new Error('Conteúdo base64 inválido ou vazio');
    }
    const buffer = Buffer.from(base64Content, 'base64');
    return this.bufferToTempFile(buffer, nome, mimeType);
  }

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
  }) {
    const tempFile = await this.bufferToTempFile(
      data.arquivo_buffer,
      data.nome,
      data.mime_type || 'application/octet-stream'
    );
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
  }) {
    const tempFile = await this.base64ToTempFile(
      data.arquivo_base64,
      data.nome,
      data.mime_type || 'application/octet-stream'
    );
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

  static async list(
    clienteId: number,
    filters?: { tipo?: string; origem?: string; sortColumn?: string; sortDirection?: string }
  ) {
    const { tipo, origem, sortColumn, sortDirection: direction } = filters || {};
    const where: Prisma.clientes_arquivosWhereInput = { cliente_id: clienteId };
    if (tipo) where.tipo = tipo as Prisma.clientes_arquivosWhereInput['tipo'];
    if (origem) where.origem = origem as Prisma.clientes_arquivosWhereInput['origem'];

    const dir = sortDirection(direction);
    const orderBy: Prisma.clientes_arquivosOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };

    return prisma.clientes_arquivos.findMany({ where, orderBy });
  }

  static async getById(id: number) {
    return prisma.clientes_arquivos.findUnique({ where: { id } });
  }

  static async findByReferencia(clienteId: number, referenciaId: number, referenciaTipo: string) {
    return prisma.clientes_arquivos.findFirst({
      where: {
        cliente_id: clienteId,
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
      },
    });
  }

  static async create(data: CreateClienteArquivoData) {
    try {
      const cliente = await prisma.clientes.findUnique({
        where: { id: data.cliente_id },
        select: { id: true },
      });
      if (!cliente) {
        throw new Error(`Cliente com ID ${data.cliente_id} não encontrado`);
      }
      if (!data.arquivo) {
        throw new Error('Arquivo é obrigatório');
      }

      const clienteDir = path.join(this.UPLOAD_DIR, String(data.cliente_id));
      const fileName = path.basename(data.arquivo.path);
      const destinoPath = path.join(clienteDir, fileName);

      if (!data.arquivo.path.startsWith(clienteDir)) {
        await this.ensureUploadDir();
        await fs.mkdir(clienteDir, { recursive: true });
        try {
          await fs.copyFile(data.arquivo.path, destinoPath);
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
      return await prisma.clientes_arquivos.create({
        data: {
          cliente_id: data.cliente_id,
          empresa_id: data.empresa_id ?? null,
          nome: data.nome,
          tipo: data.tipo,
          caminho,
          tamanho: data.arquivo.size,
          mime_type: data.mime_type || data.arquivo.mimetype || null,
          descricao: data.descricao || null,
          origem: data.origem || 'manual',
          referencia_id: data.referencia_id || null,
          referencia_tipo: data.referencia_tipo || null,
        },
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

  static async update(id: number, data: UpdateClienteArquivoData) {
    const arquivo = await prisma.clientes_arquivos.findUnique({ where: { id } });
    if (!arquivo) throw new Error('Arquivo não encontrado');
    return prisma.clientes_arquivos.update({
      where: { id },
      data: {
        ...(data.nome !== undefined ? { nome: data.nome } : {}),
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
      },
    });
  }

  static async delete(id: number): Promise<void> {
    const arquivo = await prisma.clientes_arquivos.findUnique({ where: { id } });
    if (!arquivo) throw new Error('Arquivo não encontrado');

    try {
      const filePath = path.join(this.UPLOAD_DIR, arquivo.caminho);
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn('Erro ao deletar arquivo físico', { id, error });
    }

    await prisma.clientes_arquivos.delete({ where: { id } });
  }

  static async getFileContent(id: number): Promise<Buffer> {
    const arquivo = await prisma.clientes_arquivos.findUnique({ where: { id } });
    if (!arquivo) throw new Error('Arquivo não encontrado');

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
