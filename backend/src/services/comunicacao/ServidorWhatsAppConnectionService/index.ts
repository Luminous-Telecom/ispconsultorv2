import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { ServidorWhatsAppService } from '../ServidorWhatsAppService';
import { logger } from '../../../utils/logger';

export class ServidorWhatsAppConnectionService {
  /**
   * Conecta instância na Evolution API
   */
  static async connectInstance(servidor: ServidorWhatsApp): Promise<void> {
    if (servidor.tipo_api !== 'evolution') {
      throw new Error('Método connectInstance só é válido para Evolution API');
    }

    await ServidorWhatsAppService.updateInstance(servidor, { status_conexao: 'connecting' });

    // Simular delay de conexão
    setTimeout(async () => {
      try {
        await ServidorWhatsAppService.updateInstance(servidor, { status_conexao: 'qr_required' });
        logger.info(`Instância ${servidor.instance_name} requer QR Code`);
      } catch (error) {
        logger.error('Erro ao atualizar status:', error);
      }
    }, 2000);
  }
}
