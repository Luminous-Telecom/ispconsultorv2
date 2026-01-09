import { sendValidationError } from '../../../utils/responseUtils';
import type { Response } from 'express';

export class ServidorWhatsAppValidatorService {
  /**
   * Valida dados do servidor baseado no tipo de API
   */
  static validateServidorData(servidorData: any, res?: Response): { valid: boolean; error?: string } {
    const tipoApi = servidorData.tipo_api || 'evolution';
    
    if (tipoApi === 'evolution') {
      if (!servidorData.evolution_api_url || !servidorData.evolution_api_key || !servidorData.instance_name) {
        const error = 'Para Evolution API: URL da Evolution API, chave da API e nome da instância são obrigatórios';
        if (res) {
          sendValidationError(res, error);
        }
        return { valid: false, error };
      }
    } else if (tipoApi === 'whatsapp_cloud') {
      if (!servidorData.whatsapp_cloud_token || !servidorData.whatsapp_cloud_phone_number_id) {
        const error = 'Para WhatsApp Cloud API: Token e Phone Number ID são obrigatórios';
        if (res) {
          sendValidationError(res, error);
        }
        return { valid: false, error };
      }
    }

    return { valid: true };
  }
}
