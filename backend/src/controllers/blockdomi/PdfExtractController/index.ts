import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { sendError, sendSuccess } from '../../../utils/responseUtils';

const execAsync = promisify(exec);

/** Detecta se está rodando do dist (produção) ou src (desenvolvimento) */
const isDist = __dirname.includes(`${path.sep}dist${path.sep}`);
const relativeToRoot = isDist ? '../../../' : '../../../../'; // dist: 3 níveis | src: 4 níveis até backend

class PdfExtractController {
  /**
   * Extrai domínios de um PDF usando script Python (pdfplumber)
   * POST /api/blockdomi/pdf-extract
   */
  async extractFromPdf(req: Request, res: Response): Promise<void> {
    let tempFilePath: string | null = null;

    try {
      // Verifica se há arquivo
      if (!req.file) {
        sendError(res, new Error('Nenhum arquivo PDF foi enviado'), 'Nenhum arquivo PDF foi enviado', 400);
        return;
      }

      // Salva arquivo temporariamente (dist/uploads/temp em prod, backend/uploads/temp em dev)
      const uploadsDir = path.join(__dirname, relativeToRoot, 'uploads/temp');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const tempFileName = `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
      tempFilePath = path.join(uploadsDir, tempFileName);
      
      await fs.writeFile(tempFilePath, req.file.buffer);

      // Caminho do script Python (dist/scripts em prod, backend/scripts em dev)
      const scriptPath = path.join(__dirname, relativeToRoot, 'scripts/extrair-dominios.py');

      // Executa script Python
      const { stdout } = await execAsync(
        `python3 "${scriptPath}" "${tempFilePath}"`,
        { timeout: 60000 } // 60 segundos de timeout
      );

      // Parse resultado JSON do Python
      const result = JSON.parse(stdout);

      if (!result.success) {
        sendError(res, new Error(result.error || 'Erro ao extrair domínios'), result.error || 'Erro ao extrair domínios', 500);
        return;
      }

      // Retorna domínios extraídos
      sendSuccess(res, {
        dominios: result.dominios,
        total: result.total,
        message: `${result.total} domínios extraídos com sucesso`
      });

    } catch (error: unknown) {
      const err = error as { code?: string; killed?: boolean; message?: string };
      
      if (err.code === 'ENOENT') {
        sendError(res, error, 'Python 3 não está instalado ou script não encontrado', 500);
      } else if (err.killed) {
        sendError(res, error, 'Processamento do PDF excedeu o tempo limite', 408);
      } else {
        sendError(res, error, `Erro ao processar PDF: ${err.message || 'Erro desconhecido'}`, 500);
      }
    } finally {
      // Remove arquivo temporário
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error('Erro ao remover arquivo temporário:', err);
        }
      }
    }
  }
}

export default new PdfExtractController();
