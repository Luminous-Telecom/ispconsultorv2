import fs from 'fs/promises';
import path from 'path';
import { OrdemServicoArquivo } from '../../../models/ordens/OrdemServicoArquivo';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { logger } from '../../../utils/logger';

export interface OrdemServicoArquivoItem {
  id: string;
  ordem_servico_id: string;
  descricao: string;
  nome: string;
  mime_type: string;
}

export interface CreateOrdemServicoArquivoData {
  ordem_servico_id: string;
  empresa_id?: number | null;
  nome: string;
  descricao?: string | null;
  arquivo: Express.Multer.File;
  mime_type?: string;
}

export class OrdemServicoArquivoService {
  private static readonly UPLOAD_DIR = resolveArquivosPath('ordens-servico');

  private static toItem(record: OrdemServicoArquivo): OrdemServicoArquivoItem {
    return {
      id: String(record.id),
      ordem_servico_id: record.ordem_servico_id,
      descricao: record.descricao ?? '',
      nome: record.nome,
      mime_type: record.mime_type ?? 'application/octet-stream',
    };
  }

  static async list(ordemServicoId: string): Promise<OrdemServicoArquivoItem[]> {
    const registros = await OrdemServicoArquivo.findAll({
      where: { ordem_servico_id: String(ordemServicoId) },
      order: [['id', 'DESC']],
    });
    return registros.map((registro) => this.toItem(registro));
  }

  static async create(data: CreateOrdemServicoArquivoData): Promise<OrdemServicoArquivoItem> {
    const osDir = path.join(this.UPLOAD_DIR, String(data.ordem_servico_id));
    await fs.mkdir(osDir, { recursive: true });

    const ext = path.extname(data.arquivo.originalname);
    const baseName = path.basename(data.arquivo.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${baseName}${ext}`;
    const destinoPath = path.join(osDir, fileName);

    await fs.writeFile(destinoPath, data.arquivo.buffer);

    const registro = await OrdemServicoArquivo.create({
      ordem_servico_id: String(data.ordem_servico_id),
      empresa_id: data.empresa_id ?? null,
      nome: data.nome,
      descricao: data.descricao ?? null,
      caminho: path.join(String(data.ordem_servico_id), fileName),
      tamanho: data.arquivo.size,
      mime_type: data.mime_type || data.arquivo.mimetype || null,
    });

    return this.toItem(registro);
  }

  static async delete(id: number, ordemServicoId: string): Promise<void> {
    const registro = await OrdemServicoArquivo.findOne({
      where: { id, ordem_servico_id: String(ordemServicoId) },
    });
    if (!registro) {
      throw new Error('Arquivo não encontrado');
    }

    try {
      await fs.unlink(path.join(this.UPLOAD_DIR, registro.caminho));
    } catch (error) {
      logger.warn('Erro ao deletar arquivo físico da OS', { id, error });
    }

    await registro.destroy();
  }

  static async getFileContent(
    id: number,
    ordemServicoId: string
  ): Promise<{ buffer: Buffer; nome: string; mimeType: string }> {
    const registro = await OrdemServicoArquivo.findOne({
      where: { id, ordem_servico_id: String(ordemServicoId) },
    });
    if (!registro) {
      throw new Error('Arquivo não encontrado');
    }

    const buffer = await fs.readFile(path.join(this.UPLOAD_DIR, registro.caminho));

    return {
      buffer,
      nome: registro.nome,
      mimeType: registro.mime_type ?? 'application/octet-stream',
    };
  }
}
