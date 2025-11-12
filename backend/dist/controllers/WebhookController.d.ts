import { Request, Response } from 'express';
export declare class WebhookController {
    static efiWebhook(req: Request, res: Response): Promise<void>;
    private static processarTokenNotificacao;
    private static processarDadosNotificacao;
    private static processarNotificacaoIndividual;
    private static processarNotificacaoTitulo;
    private static processarNotificacaoCharge;
    private static processarNotificacaoPix;
    private static processarNotificacaoGenerica;
    private static consultarDadosAtualizadosTitulo;
    private static mapearStatusEfi;
    private static isWebhookSecretValid;
    static asaasWebhook(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=WebhookController.d.ts.map