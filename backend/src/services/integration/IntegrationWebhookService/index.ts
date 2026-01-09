import { UsuarioService } from '../../cadastros/UsuarioService';

export class IntegrationWebhookService {
  /**
   * Valida secret do webhook
   */
  static async isSecretValid(secret?: string): Promise<boolean> {
    if (!secret || typeof secret !== 'string') {
      return false;
    }

    const usuario = await UsuarioService.findByWebhookSecret(secret);

    if (usuario && usuario.webhook_secret === secret) {
      return true;
    }

    return false;
  }
}
