import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { authRateLimitMiddleware } from '../../middleware/rateLimitMiddleware';

const router = Router();

router.post('/login', authRateLimitMiddleware(), AuthController.login);
router.post('/2fa/verify', authRateLimitMiddleware(), AuthController.verify2fa);
router.post('/2fa/email/send', authRateLimitMiddleware(), AuthController.sendEmail2faCode);
router.post('/2fa/webauthn/login-options', authRateLimitMiddleware(), AuthController.webauthnLoginOptions);
router.post('/2fa/webauthn/login-verify', authRateLimitMiddleware(), AuthController.webauthnLoginVerify);

router.get('/2fa/status', AuthController.twoFactorStatus);
router.post('/2fa/setup', AuthController.twoFactorSetup);
router.post('/2fa/confirm', AuthController.twoFactorConfirm);
router.post('/2fa/disable', AuthController.twoFactorDisable);
router.post('/2fa/email', AuthController.setEmail2fa);

router.post('/2fa/webauthn/register-options', AuthController.webauthnRegisterOptions);
router.post('/2fa/webauthn/register-verify', AuthController.webauthnRegisterVerify);
router.delete('/2fa/webauthn/:id', AuthController.webauthnRemove);

router.delete('/2fa/trusted-devices/:id', AuthController.revokeTrustedDevice);
router.delete('/2fa/trusted-devices', AuthController.revokeAllTrustedDevices);

router.get('/me', AuthController.me);
router.patch('/me', AuthController.updateMe);
router.post('/me/email-recuperacao/enviar', AuthController.sendRecoveryEmailValidation);
router.post('/email-recuperacao/confirmar', authRateLimitMiddleware(), AuthController.confirmRecoveryEmail);
// Retorna o JWT para uso no Socket.IO (lido do cookie HttpOnly)
router.get('/socket-token', AuthController.socketToken);
// Logout limpa o cookie HttpOnly — acessível mesmo sem token válido
router.post('/logout', AuthController.logout);

export default router;
