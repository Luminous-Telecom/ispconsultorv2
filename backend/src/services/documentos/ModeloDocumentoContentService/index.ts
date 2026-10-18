import { ModeloDocumentoService } from '../ModeloDocumentoService';

export class ModeloDocumentoContentService {
  /**
   * Salva conteúdo de um modelo específico
   */
  static async salvarConteudo(
    modeloDocumentoId: number,
    campo: 'conteudo' | 'conteudo_adesao' | 'conteudo_permanencia' | 'conteudo_recibo' | 'conteudo_carta',
    conteudo: string
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const atualizado = await ModeloDocumentoService.update(modeloDocumentoId, { [campo]: conteudo });

      const mensagens: Record<string, string> = {
        conteudo: 'Modelo de documento salvo com sucesso',
        conteudo_adesao: 'Modelo de termo de adesão salvo com sucesso',
        conteudo_permanencia: 'Modelo de contrato de permanência salvo com sucesso',
        conteudo_recibo: 'Modelo de recibo salvo com sucesso',
        conteudo_carta: 'Modelo de carta de cobrança salvo com sucesso',
      };

      return {
        success: true,
        message: mensagens[campo] || 'Conteúdo salvo com sucesso',
        data: atualizado,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('não encontrado')) {
        return {
          success: false,
          message: 'Modelo de documento não encontrado',
        };
      }
      throw error;
    }
  }
}

