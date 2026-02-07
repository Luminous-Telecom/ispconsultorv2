import { apiService } from './api';

export interface PdfExtractResponse {
  success: boolean;
  data?: {
    dominios: string[];
    total: number;
    message: string;
    /** Data início da operação (YYYY-MM-DD) quando extraída do PDF */
    data_inicio_bloqueio?: string | null;
    /** Data término da operação (YYYY-MM-DD) quando extraída do PDF */
    data_fim_bloqueio?: string | null;
  };
  message?: string;
}

class PdfExtractService {
  /**
   * Extrai domínios de um arquivo PDF usando Python (pymupdf)
   * @param file Arquivo PDF
   * @returns Lista de domínios extraídos
   */
  static async extractFromPdf(file: File): Promise<PdfExtractResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await apiService.post<PdfExtractResponse>(
        '/pdf-extract/extract',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 320000, // 5 min (script Python pode demorar em PDFs grandes)
        }
      );

      if (!response.success || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }

      return response as { success: boolean; data?: { dominios: string[]; total: number; message: string } };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      
      throw new Error('Erro ao processar PDF. Verifique se o arquivo é válido.');
    }
  }

  /**
   * Extrai domínios de um PDF a partir de URL
   * @param url URL do PDF
   * @returns Lista de domínios extraídos
   */
  static async extractFromPdfUrl(url: string): Promise<PdfExtractResponse> {
    try {
      const response = await apiService.post<PdfExtractResponse>(
        '/pdf-extract/extract-from-url',
        { url: url.trim() },
        { timeout: 320000 }
      );

      if (!response.success || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }

      return response as { success: boolean; data?: { dominios: string[]; total: number; message: string } };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Erro ao processar PDF. Verifique se a URL é válida e acessível.');
    }
  }
}

export default PdfExtractService;
