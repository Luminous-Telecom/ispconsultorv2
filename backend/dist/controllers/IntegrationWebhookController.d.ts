import { Request, Response } from 'express';
export declare class IntegrationWebhookController {
    static handleIntegration(req: Request, res: Response): Promise<void>;
    private static isSecretValid;
    private static parseLimit;
    private static parseOffset;
    private static handleClientsSync;
    private static parseNumber;
    private static parseNullableNumber;
    private static formatDate;
}
//# sourceMappingURL=IntegrationWebhookController.d.ts.map