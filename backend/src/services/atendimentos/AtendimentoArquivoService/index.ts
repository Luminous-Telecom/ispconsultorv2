import fs from 'fs/promises';
import path from 'path';
import { AtendimentoArquivo } from '../../../models/atendimentos/AtendimentoArquivo';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { logger } from '../../../utils/logger';

export interface AtendimentoArquivoItem {
  id: string;
  atendimento_id: string;
  descricao: string;
  nome: string;
  mime_type: string;
}

export interface CreateAtendimentoArquivoData {
  atendimento_id: string;
  empresa_id?: number | null;
  nome: string;
  descricao?: string | null;
  arquivo: Express.Multer.File;
  mime_type?: string;
}

export class AtendimentoArquivoService {
  private static readonly UPLOAD_DIR = resolveArquivosPath('atendimentos');

  private static toItem(record: AtendimentoArquivo): AtendimentoArquivoItem {
    return {
      id: String(record.id),
      atendimento_id: record.atendimento_id,
      descricao: record.descricao ?? '',
      nome: record.nome,
      mime_type: record.mime_type ?? 'application/octet-stream',
    };
  }

  static async list(atendimentoId: string): Promise<AtendimentoArquivoItem[]> {
    const registros = await AtendimentoArquivo.findAll({
      where: { atendimento_id: String(atendimentoId) },
      order: [['id', 'DESC']],
    });
    return registros.map((registro) => this.toItem(registro));
  }

  static async create(data: CreateAtendimentoArquivoData): Promise<AtendimentoArquivoItem> {
    const atendimentoDir = path.join(this.UPLOAD_DIR, String(data.atendimento_id));
    await fs.mkdir(atendimentoDir, { recursive: true });

    const ext = path.extname(data.arquivo.originalname);
    const baseName = path.basename(data.arquivo.originalname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${baseName}${ext}`;
    const destinoPath = path.join(atendimentoDir, fileName);

    await fs.writeFile(destinoPath, data.arquivo.buffer);

    const registro = await AtendimentoArquivo.create({
      atendimento_id: String(data.atendimento_id),
      empresa_id: data.empresa_id ?? null,
      nome: data.nome,
      descricao: data.descricao ?? null,
      caminho: path.join(String(data.atendimento_id), fileName),
      tamanho: data.arquivo.size,
      mime_type: data.mime_type || data.arquivo.mimetype || null,
    });

    return this.toItem(registro);
  }

  static async delete(id: number, atendimentoId: string): Promise<void> {
    const registro = await AtendimentoArquivo.findOne({
      where: { id, atendimento_id: String(atendimentoId) },
    });
    if (!registro) {
      throw new Error('Arquivo não encontrado');
    }

    try {
      await fs.unlink(path.join(this.UPLOAD_DIR, registro.caminho));
    } catch (error) {
      logger.warn('Erro ao deletar arquivo físico do atendimento', { id, error });
    }

    await registro.destroy();
  }

  static async getFileContent(
    id: number,
    atendimentoId: string
  ): Promise<{ buffer: Buffer; nome: string; mimeType: string }> {
    const registro = await AtendimentoArquivo.findOne({
      where: { id, atendimento_id: String(atendimentoId) },
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
