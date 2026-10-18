import { Request, Response } from 'express';
import Joi from 'joi';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { UsuarioService } from '../../services/cadastros/UsuarioService';
import { TwoFactorService } from '../../services/sistema/TwoFactorService';
import { TrustedDeviceService } from '../../services/sistema/TrustedDeviceService';
import { EmailTwoFactorService } from '../../services/sistema/EmailTwoFactorService';
import { WebAuthnService } from '../../services/sistema/WebAuthnService';
import { UserProfileService } from '../../services/sistema/UserProfileService';
import { registrarLogin, registrarLogout } from '../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest as AuthRequest } from '../../types/auth';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized, sendNotFound } from '../../utils/responseUtils';
import { isProduction } from '../../utils/envUtils';
import { getClientIp } from '../../utils/requestUtils';
import { joiErrorsToFieldMap } from '../../utils/validationUtils';

/**
 * Converte string de duração JWT (ex: '24h', '7d', '30m') para milissegundos.
 * Usado para definir o maxAge do cookie.
 */
const jwtDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // padrão: 24h
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
};

interface AuthenticatedRequest extends Request {
  user?: JwtPayload | string;
}

type CookieRequest = Request & { cookies?: Record<string, string> };

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter pelo menos 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
});

const verify2faSchema = Joi.object({
  temp_token: Joi.string().required().messages({
    'any.required': 'Token temporário é obrigatório',
  }),
  code: Joi.string().trim().required().messages({
    'any.required': 'Código é obrigatório',
  }),
  remember_browser: Joi.boolean().optional(),
});

const confirm2faSchema = Joi.object({
  code: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'Código deve ter 6 dígitos',
    'any.required': 'Código é obrigatório',
  }),
});

const disable2faSchema = Joi.object({
  password: Joi.string().min(6).required().messages({
    'any.required': 'Senha é obrigatória',
  }),
  code: Joi.string().trim().required().messages({
    'any.required': 'Código é obrigatório',
  }),
});

const email2faToggleSchema = Joi.object({
  enabled: Joi.boolean().required().messages({
    'any.required': 'Informe se deseja ativar ou desativar',
  }),
});

const tempTokenSchema = Joi.object({
  temp_token: Joi.string().required().messages({
    'any.required': 'Token temporário é obrigatório',
  }),
});

const webauthnLoginVerifySchema = Joi.object({
  temp_token: Joi.string().required(),
  credential: Joi.object().required(),
  remember_browser: Joi.boolean().optional(),
});

const webauthnRegisterVerifySchema = Joi.object({
  credential: Joi.object().required(),
  device_name: Joi.string().trim().max(150).allow('', null).optional(),
});

const buildToken = (payload: JwtPayload, expiresInOverride?: SignOptions['expiresIn']): string => {
  const jwtSecret: Secret | undefined = process.env.JWT_SECRET;
  const jwtExpiresIn = (expiresInOverride ?? (process.env.JWT_EXPIRES_IN || '24h')) as SignOptions['expiresIn'];

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  const signOptions: SignOptions = {
    expiresIn: jwtExpiresIn,
  };

  if (process.env.JWT_AUDIENCE) {
    signOptions.audience = process.env.JWT_AUDIENCE;
  }

  if (process.env.JWT_ISSUER) {
    signOptions.issuer = process.env.JWT_ISSUER;
  }

  return jwt.sign(payload, jwtSecret, signOptions);
};

const buildSessionPayload = (usuario: {
  id: number;
  email: string;
  nome: string | null;
  role: string;
  empresa_id: number | null;
}): JwtPayload => ({
  sub: String(usuario.id),
  email: usuario.email,
  nome: usuario.nome ?? null,
  role: usuario.role,
  empresa_id: usuario.empresa_id ?? null,
});

const setAuthCookie = (res: Response, token: string): void => {
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
    maxAge: jwtDurationToMs(jwtExpiresIn),
  });
};

const setTrustedDeviceCookie = (res: Response, token: string): void => {
  res.cookie(TrustedDeviceService.cookieName, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
    maxAge: TrustedDeviceService.maxAgeMs,
  });
};

const clearTrustedDeviceCookie = (res: Response): void => {
  res.clearCookie(TrustedDeviceService.cookieName, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
  });
};

const completeLogin = async (
  req: Request,
  res: Response,
  usuario: {
    id: number;
    email: string;
    nome: string | null;
    role: string;
    empresa_id: number | null;
    precisa_trocar_senha: boolean;
    ultimo_login: Date | null;
    totp_enabled?: boolean;
  },
  options?: { rememberBrowser?: boolean }
): Promise<void> => {
  const token = buildToken(buildSessionPayload(usuario));

  await UsuarioService.updateUltimoLogin(usuario.id);

  const authReq = req as unknown as AuthRequest;
  authReq.user = {
    sub: String(usuario.id),
    email: usuario.email,
    nome: usuario.nome ?? null,
    empresa_id: usuario.empresa_id ?? null,
  };
  await registrarLogin(authReq, usuario.id, 'Login realizado com sucesso', usuario.empresa_id ?? null);

  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  setAuthCookie(res, token);

  if (options?.rememberBrowser) {
    const trusted = await TrustedDeviceService.create(usuario.id, usuario.empresa_id, {
      userAgent: req.get('user-agent') || null,
      ip: getClientIp(req),
    });
    setTrustedDeviceCookie(res, trusted.token);
  }

  sendSuccess(res, {
    token,
    token_type: 'Bearer',
    expires_in: jwtExpiresIn,
    user: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      empresa_id: usuario.empresa_id ?? null,
      precisaTrocarSenha: usuario.precisa_trocar_senha,
      ultimoLogin: usuario.ultimo_login,
      totp_enabled: usuario.totp_enabled ?? false,
    },
  }, 'Autenticação realizada com sucesso');
};

const getAuthenticatedUserId = (req: Request): number | null => {
  const authenticatedReq = req as AuthenticatedRequest;
  const userPayload = authenticatedReq.user as JwtPayload | undefined;
  if (!userPayload?.sub) return null;
  const id = parseInt(String(userPayload.sub), 10);
  return Number.isFinite(id) ? id : null;
};

/** Origin do browser para WebAuthn (rp.id deve bater com o hostname). */
const getRequestOrigin = (req: Request): string | null => {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const parseTempTokenUserId = (tempToken: string): number => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }
  let payload: JwtPayload & { purpose?: string };
  try {
    payload = jwt.verify(tempToken, jwtSecret) as JwtPayload & { purpose?: string };
  } catch {
    throw new Error('SESSION_EXPIRED');
  }
  if (payload.purpose !== '2fa_pending' || !payload.sub) {
    throw new Error('INVALID_TOKEN');
  }
  const usuarioId = parseInt(String(payload.sub), 10);
  if (!Number.isFinite(usuarioId)) {
    throw new Error('INVALID_TOKEN');
  }
  return usuarioId;
};

const sendTempTokenError = (res: Response, err: unknown): boolean => {
  const message = err instanceof Error ? err.message : '';
  if (message === 'SESSION_EXPIRED') {
    sendUnauthorized(res, 'Sessão de verificação expirada. Faça login novamente.');
    return true;
  }
  if (message === 'INVALID_TOKEN') {
    sendUnauthorized(res, 'Token de verificação inválido');
    return true;
  }
  if (message === 'JWT_SECRET não configurado') {
    sendError(res, err, 'Erro de configuração', 500, true);
    return true;
  }
  return false;
};

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const usuario = await UsuarioService.findByEmailWithPassword(value.email, true);

      if (!usuario) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      const isPasswordValid = await bcrypt.compare(value.password, usuario.password_hash);

      if (!isPasswordValid) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      if (usuario.empresa_id == null) {
        sendUnauthorized(res, 'Usuário sem empresa vinculada não pode acessar o ADM');
        return;
      }

      const methods = await TwoFactorService.getLoginMethods(usuario.id);
      if (methods.any) {
        const trustedCookie = (req as CookieRequest).cookies?.[TrustedDeviceService.cookieName];
        if (await TrustedDeviceService.isTrusted(usuario.id, trustedCookie)) {
          await completeLogin(req, res, usuario);
          return;
        }

        const tempToken = buildToken(
          {
            sub: String(usuario.id),
            purpose: '2fa_pending',
            email: usuario.email,
          },
          '5m'
        );
        sendSuccess(res, {
          requires_2fa: true,
          temp_token: tempToken,
          methods: {
            totp: methods.totp,
            email: methods.email,
            webauthn: methods.webauthn,
            smtp_configured: methods.smtp_configured,
          },
        }, 'Informe o código de autenticação em duas etapas');
        return;
      }

      await completeLogin(req, res, usuario);
    } catch (err) {
      sendError(res, err, 'Erro inesperado durante login', 500, true);
    }
  }

  static async verify2fa(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = verify2faSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      let usuarioId: number;
      try {
        usuarioId = parseTempTokenUserId(value.temp_token);
      } catch (err) {
        if (sendTempTokenError(res, err)) return;
        throw err;
      }

      const codeOk = await TwoFactorService.verifyLoginCode(usuarioId, value.code);
      if (!codeOk) {
        sendUnauthorized(res, 'Código de autenticação inválido');
        return;
      }

      const usuario = await UsuarioService.findByIdWithPassword(usuarioId, true);
      if (!usuario || usuario.empresa_id == null) {
        sendUnauthorized(res, 'Usuário não encontrado ou sem empresa vinculada');
        return;
      }

      await completeLogin(req, res, usuario, { rememberBrowser: !!value.remember_browser });
    } catch (err) {
      sendError(res, err, 'Erro ao verificar autenticação em duas etapas', 500, true);
    }
  }

  static async sendEmail2faCode(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = tempTokenSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      let usuarioId: number;
      try {
        usuarioId = parseTempTokenUserId(value.temp_token);
      } catch (err) {
        if (sendTempTokenError(res, err)) return;
        throw err;
      }

      const result = await EmailTwoFactorService.sendLoginCode(usuarioId);
      sendSuccess(res, result, 'Código enviado por e-mail');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar código';
      if (
        message.includes('não está ativada') ||
        message.includes('não configurado') ||
        message.includes('Configure o servidor')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao enviar código por e-mail', 500, true);
    }
  }

  static async webauthnLoginOptions(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = tempTokenSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      let usuarioId: number;
      try {
        usuarioId = parseTempTokenUserId(value.temp_token);
      } catch (err) {
        if (sendTempTokenError(res, err)) return;
        throw err;
      }

      const options = await WebAuthnService.startAuthentication(usuarioId, getRequestOrigin(req));
      sendSuccess(res, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (message.includes('Nenhuma chave')) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao iniciar autenticação com chave de acesso', 500, true);
    }
  }

  static async webauthnLoginVerify(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = webauthnLoginVerifySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      let usuarioId: number;
      try {
        usuarioId = parseTempTokenUserId(value.temp_token);
      } catch (err) {
        if (sendTempTokenError(res, err)) return;
        throw err;
      }

      const ok = await WebAuthnService.finishAuthentication(
        usuarioId,
        value.credential as AuthenticationResponseJSON,
        getRequestOrigin(req)
      );
      if (!ok) {
        sendUnauthorized(res, 'Chave de acesso inválida');
        return;
      }

      const usuario = await UsuarioService.findByIdWithPassword(usuarioId, true);
      if (!usuario || usuario.empresa_id == null) {
        sendUnauthorized(res, 'Usuário não encontrado ou sem empresa vinculada');
        return;
      }

      await completeLogin(req, res, usuario, { rememberBrowser: !!value.remember_browser });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('expirado')) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao verificar chave de acesso', 500, true);
    }
  }

  static async twoFactorStatus(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const status = await TwoFactorService.getStatus(usuarioId);
      sendSuccess(res, status);
    } catch (err) {
      sendError(res, err, 'Erro ao consultar status da autenticação em duas etapas', 500, true);
    }
  }

  static async twoFactorSetup(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const usuario = await UsuarioService.getById(usuarioId);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      const setup = await TwoFactorService.startSetup(usuarioId, usuario.email);
      sendSuccess(res, setup, 'Escaneie o QR Code no aplicativo autenticador');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar configuração';
      if (
        message.includes('já está ativada') ||
        message.includes('não encontrado')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao iniciar autenticação em duas etapas', 500, true);
    }
  }

  static async twoFactorConfirm(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const { error, value } = confirm2faSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const result = await TwoFactorService.confirmSetup(usuarioId, value.code);
      sendSuccess(res, result, 'Autenticação em duas etapas ativada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao confirmar';
      if (
        message.includes('inválido') ||
        message.includes('já está ativada') ||
        message.includes('Inicie a configuração')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao confirmar autenticação em duas etapas', 500, true);
    }
  }

  static async twoFactorDisable(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const { error, value } = disable2faSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      await TwoFactorService.disable(usuarioId, value.password, value.code);
      sendSuccess(res, { enabled: false }, 'Autenticação em duas etapas desativada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar';
      if (
        message.includes('incorreta') ||
        message.includes('inválido') ||
        message.includes('não está ativada')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao desativar autenticação em duas etapas', 500, true);
    }
  }

  static async twoFactorReconfigure(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const { error, value } = disable2faSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const usuario = await UsuarioService.getById(usuarioId);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      const setup = await TwoFactorService.reconfigure(
        usuarioId,
        usuario.email,
        value.password,
        value.code
      );
      sendSuccess(res, setup, 'Escaneie o novo QR Code no aplicativo autenticador');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reconfigurar';
      if (
        message.includes('incorreta') ||
        message.includes('inválido') ||
        message.includes('não está ativada')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao reconfigurar autenticação em duas etapas', 500, true);
    }
  }

  static async setEmail2fa(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const { error, value } = email2faToggleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      await EmailTwoFactorService.setEnabled(usuarioId, value.enabled);
      sendSuccess(
        res,
        { email_2fa_enabled: value.enabled },
        value.enabled ? 'Autenticação por e-mail ativada' : 'Autenticação por e-mail desativada'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (
        message.includes('Configure o servidor') ||
        message.includes('não encontrado') ||
        message.includes('sem e-mail')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao configurar autenticação por e-mail', 500, true);
    }
  }

  static async webauthnRegisterOptions(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const usuario = await UsuarioService.getById(usuarioId);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      const options = await WebAuthnService.startRegistration(
        usuarioId,
        usuario.email,
        usuario.nome,
        getRequestOrigin(req)
      );
      sendSuccess(res, options);
    } catch (err) {
      sendError(res, err, 'Erro ao iniciar registro de chave de acesso', 500, true);
    }
  }

  static async webauthnRegisterVerify(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const { error, value } = webauthnRegisterVerifySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const usuario = await UsuarioService.getById(usuarioId);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }
      const created = await WebAuthnService.finishRegistration(
        usuarioId,
        usuario.empresa_id ?? null,
        value.credential as RegistrationResponseJSON,
        value.device_name || null,
        getRequestOrigin(req)
      );
      sendSuccess(res, created, 'Chave de acesso adicionada');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (message.includes('expirado') || message.includes('verificar')) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao registrar chave de acesso', 500, true);
    }
  }

  static async webauthnRemove(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const credentialId = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(credentialId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      await WebAuthnService.remove(usuarioId, credentialId);
      sendSuccess(res, { removed: true }, 'Chave de acesso removida');
    } catch (err) {
      sendError(res, err, 'Erro ao remover chave de acesso', 500, true);
    }
  }

  static async revokeTrustedDevice(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const deviceId = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(deviceId)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      await TrustedDeviceService.revoke(usuarioId, deviceId);
      sendSuccess(res, { removed: true }, 'Dispositivo removido');
    } catch (err) {
      sendError(res, err, 'Erro ao remover dispositivo confiável', 500, true);
    }
  }

  static async revokeAllTrustedDevices(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      await TrustedDeviceService.revokeAll(usuarioId);
      clearTrustedDeviceCookie(res);
      sendSuccess(res, { removed: true }, 'Todos os dispositivos confiáveis foram removidos');
    } catch (err) {
      sendError(res, err, 'Erro ao remover dispositivos confiáveis', 500, true);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const cookieToken = (req as CookieRequest).cookies?.auth_token;
    if (cookieToken) {
      try {
        const payload = jwt.decode(cookieToken) as {
          sub?: string;
          email?: string;
          nome?: string | null;
          empresa_id?: number | null;
        } | null;
        if (payload?.sub) {
          const usuarioId = parseInt(payload.sub, 10);
          const authReq = req as unknown as AuthRequest;
          authReq.user = {
            sub: payload.sub,
            email: payload.email,
            nome: typeof payload.nome === 'string' ? payload.nome : null,
            empresa_id: payload.empresa_id ?? null,
          };
          registrarLogout(
            authReq,
            usuarioId,
            'Logout realizado com sucesso',
            payload.empresa_id ?? null
          ).catch(() => { /* não crítico */ });
        }
      } catch {
        /* ignora falha ao decodificar — logout continua */
      }
    }
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'strict',
      path: '/',
    });
    sendSuccess(res, null, 'Logout realizado com sucesso');
  }

  /**
   * Retorna o token JWT para uso no Socket.IO.
   * O token é lido do cookie HttpOnly e devolvido no corpo da resposta.
   * Necessário pois o Socket.IO não tem acesso a cookies HttpOnly nativamente.
   */
  static socketToken(req: Request, res: Response): void {
    const token = (req as CookieRequest).cookies?.auth_token;
    if (!token) {
      sendUnauthorized(res, 'Sessão não encontrada');
      return;
    }
    sendSuccess(res, { token }, 'Token obtido com sucesso');
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }

      const usuario = await UsuarioService.getById(usuarioId);
      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      const profile = await UserProfileService.getProfile(usuarioId);
      sendSuccess(res, {
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        role: profile.role,
        empresa_id: profile.empresa_id,
        precisaTrocarSenha: usuario.precisa_trocar_senha,
        ultimoLogin: usuario.ultimo_login,
        totp_enabled: profile.totp_enabled,
        email_recuperacao: profile.email_recuperacao,
        email_recuperacao_verificado: profile.email_recuperacao_verificado,
      });
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário atual', 500, true);
    }
  }

  static async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }

      const schema = Joi.object({
        nome: Joi.string().trim().min(1).max(150).optional(),
        email: Joi.string().email().optional(),
        email_recuperacao: Joi.string().email().allow('', null).optional(),
      }).min(1);

      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const payload = {
        ...value,
        email_recuperacao:
          value.email_recuperacao === '' || value.email_recuperacao === null
            ? null
            : value.email_recuperacao,
      };

      const profile = await UserProfileService.updateProfile(usuarioId, payload);
      sendSuccess(res, profile, 'Perfil atualizado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (
        message.includes('obrigatório') ||
        message.includes('inválido') ||
        message.includes('já está em uso') ||
        message.includes('diferente')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao atualizar perfil', 500, true);
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const schema = Joi.object({
        current_password: Joi.string().min(6).required().messages({
          'any.required': 'Senha atual é obrigatória',
        }),
        password: Joi.string().min(6).required().messages({
          'string.min': 'Nova senha deve ter pelo menos 6 caracteres',
          'any.required': 'Nova senha é obrigatória',
        }),
        password_confirmation: Joi.string().required().valid(Joi.ref('password')).messages({
          'any.only': 'A confirmação de senha não confere',
          'any.required': 'Confirmação de senha é obrigatória',
        }),
      });
      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      await UserProfileService.changePassword(usuarioId, value.current_password, value.password);
      sendSuccess(res, { changed: true }, 'Senha alterada com sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (
        message.includes('incorreta') ||
        message.includes('diferente') ||
        message.includes('pelo menos') ||
        message.includes('não encontrado')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao alterar senha', 500, true);
    }
  }

  static async sendRecoveryEmailValidation(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = getAuthenticatedUserId(req);
      if (!usuarioId) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }
      const origin = getRequestOrigin(req) || process.env.BASE_URL || 'http://localhost:3000';
      const result = await UserProfileService.sendRecoveryEmailValidation(usuarioId, origin);
      sendSuccess(res, result, 'E-mail de confirmação enviado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (
        message.includes('Cadastre') ||
        message.includes('já está validado') ||
        message.includes('Configure o servidor') ||
        message.includes('não encontrado')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao enviar e-mail de confirmação', 500, true);
    }
  }

  static async confirmRecoveryEmail(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        token: Joi.string().trim().required(),
      });
      const { error, value } = schema.validate(
        { token: req.body?.token ?? req.query?.token },
        { abortEarly: false, stripUnknown: true }
      );
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      await UserProfileService.confirmRecoveryEmail(value.token);
      sendSuccess(res, { verified: true }, 'E-mail de recuperação confirmado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (message.includes('inválido') || message.includes('expirado')) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao confirmar e-mail de recuperação', 500, true);
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': 'E-mail inválido',
          'any.required': 'E-mail é obrigatório',
          'string.empty': 'E-mail é obrigatório',
        }),
      });
      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const { PasswordResetService } = await import('../../services/sistema/PasswordResetService');
      const origin = getRequestOrigin(req) || process.env.BASE_URL || 'http://localhost:3000';
      const result = await PasswordResetService.requestReset(value.email, origin);
      sendSuccess(res, undefined, result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (message.includes('inválido')) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao solicitar redefinição de senha', 500, true);
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        token: Joi.string().trim().required(),
        password: Joi.string().min(6).required().messages({
          'string.min': 'A senha deve ter no mínimo 6 caracteres',
          'any.required': 'Senha é obrigatória',
          'string.empty': 'Senha é obrigatória',
        }),
        password_confirmation: Joi.string().required().valid(Joi.ref('password')).messages({
          'any.only': 'A confirmação de senha não confere',
          'any.required': 'Confirmação de senha é obrigatória',
        }),
      });
      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const { PasswordResetService } = await import('../../services/sistema/PasswordResetService');
      await PasswordResetService.resetPassword(value.token, value.password);
      sendSuccess(res, undefined, 'Senha redefinida com sucesso. Faça login com a nova senha.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro';
      if (
        message.includes('inválido') ||
        message.includes('expirado') ||
        message.includes('mínimo')
      ) {
        sendValidationError(res, message);
        return;
      }
      sendError(res, err, 'Erro ao redefinir senha', 500, true);
    }
  }
}

export default AuthController;
