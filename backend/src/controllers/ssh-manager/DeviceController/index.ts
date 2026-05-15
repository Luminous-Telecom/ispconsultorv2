import { Request, Response } from 'express';
import Joi from 'joi';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { SshDeviceBackup } from '../../../models/ssh-manager/SshDeviceBackup';
import { Agent } from '../../../models/agent/Agent';
import { Cliente } from '../../../models/clientes/Cliente';
import { isAgentOnline, testSshThroughAgent } from '../../../services/agent/AgentService';
import { encrypt, decryptSshCredential } from '../../../utils/encryption';
import { normalizeSshPrivateKeyPem, privateKeyPemForSsh2 } from '../../../utils/sshPrivateKey';
import { sshPool } from '../../../services/ssh-manager/SshPoolService';
import { openDeviceConnection, executeCommand, buildFriendlyError } from '../../../services/ssh-manager/SshConnectionService';
import { logSshAudit } from '../../../services/ssh-manager/SshAuditService';
import {
  listBackupsForDevice,
  listBackupsForDeviceIds,
  resolveBackupFileForDownload,
  deleteBackup as deleteBackupStorage,
} from '../../../services/ssh-manager/SshDeviceBackupStorageService';
import { runSshDeviceBackup } from '../../../services/ssh-manager/SshDeviceBackupRunner';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
} from '../../../utils/responseUtils';
import { Op, WhereOptions, literal } from 'sequelize';
import { AuthenticatedRequest } from '../../../types/auth';
import { JwtPayload } from 'jsonwebtoken';
import {
  getEmpresaIdOrNull,
  parseEmpresaIdQuery,
  resolveEmpresaScopeForList,
  resolveEmpresaIdForScopedCreate,
} from '../../../utils/tenantUtils';
import { getEquipamentosLimites } from '../../../services/saas/PlanoModulosService';
import { logger } from '../../../utils/logger';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';

function parseClienteIdQuery(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeOptionalAgentId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const optionalAgentId = Joi.number().integer().positive().allow(null).optional();

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  );
}

function getUserId(req: Request): string {
  const user = (req as AuthenticatedRequest).user as JwtPayload | undefined;
  return String(user?.sub ?? 'unknown');
}

function canAccessDevice(device: SshDevice, userEmpresaId: number | null): boolean {
  if (device.empresa_id === null) return true;
  if (userEmpresaId === null) return true;
  return device.empresa_id === userEmpresaId;
}

const createSchema = Joi.object({
  agent_id: optionalAgentId,
  cliente_id: Joi.number().integer().positive().allow(null).optional(),
  name: Joi.string().min(2).max(100).required(),
  host: Joi.string().min(1).max(255).required(),
  port: Joi.number().integer().min(1).max(65535).default(22),
  username: Joi.string().min(1).max(100).required(),
  password: Joi.string().min(1).required(),
  private_key: Joi.string().allow(null, '').optional(),
  device_type: Joi.string().valid('mikrotik', 'cisco', 'huawei', 'swos').default('mikrotik'),
  description: Joi.string().max(500).allow(null, '').optional(),
  is_active: Joi.boolean().default(true),
  backup_enabled: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string()).allow(null).optional(),
  empresa_id: Joi.number().integer().positive().optional(),
});

const updateSchema = Joi.object({
  agent_id: optionalAgentId,
  cliente_id: Joi.number().integer().positive().allow(null).optional(),
  name: Joi.string().min(2).max(100).optional(),
  host: Joi.string().min(1).max(255).optional(),
  port: Joi.number().integer().min(1).max(65535).optional(),
  username: Joi.string().min(1).max(100).optional(),
  password: Joi.string().min(1).optional(),
  private_key: Joi.string().allow(null, '').optional(),
  device_type: Joi.string().valid('mikrotik', 'cisco', 'huawei', 'swos').optional(),
  description: Joi.string().max(500).allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
  backup_enabled: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).allow(null).optional(),
});

export class DeviceController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const scopeEmpresaId = resolveEmpresaScopeForList(req, parseEmpresaIdQuery(req.query.empresa_id));
      const clienteId = parseClienteIdQuery(req.query.cliente_id);
      const parts: WhereOptions<SshDevice>[] = [];
      if (scopeEmpresaId != null) {
        parts.push({ [Op.or]: [{ empresa_id: scopeEmpresaId }, { empresa_id: null }] });
      }
      if (clienteId != null) {
        parts.push({ cliente_id: clienteId });
      }
      const where: WhereOptions<SshDevice> =
        parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { [Op.and]: parts };

      const devices = await SshDevice.findAll({
        where,
        order: [['name', 'ASC']],
        include: [
          { model: Agent, as: 'agent', attributes: ['id', 'name', 'is_active'] },
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
            required: false,
          },
        ],
      });
      const payload = devices.map((d) => {
        const row = d.toJSON() as Record<string, unknown>;
        const ag = row.agent as { id?: number; name?: string; is_active?: boolean } | null | undefined;
        if (ag && typeof ag === 'object' && ag.id != null) {
          const active = ag.is_active !== false;
          row.agent = {
            id: ag.id,
            name: ag.name,
            online: active && isAgentOnline(ag.id),
          };
        }
        return row;
      });
      sendSuccess(res, payload);
    } catch (error) {
      sendError(res, error, 'Erro ao listar devices SSH', 500, true, { context: 'DeviceController.index' });
    }
  }

  static async show(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia'],
            required: false,
          },
        ],
      });
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      sendSuccess(res, device);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar device SSH', 500, true, { context: 'DeviceController.show' });
    }
  }

  static async store(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false });
      if (error) {
        sendValidationError(res, error.details.map((d) => d.message).join('; '));
        return;
      }

      const resolved = await resolveEmpresaIdForScopedCreate(req, {
        cliente_id: value.cliente_id ?? null,
        empresa_id: value.empresa_id ?? null,
      });
      if (!resolved.ok) {
        sendValidationError(res, resolved.message);
        return;
      }
      const empresaId = resolved.empresa_id;
      if (empresaId != null) {
        const limites = await getEquipamentosLimites(empresaId);
        if (limites !== null) {
          if (!limites.temModulo) {
            sendValidationError(res, 'O plano não inclui o módulo de equipamentos.');
            return;
          }
          if (limites.limite_equipamentos > 0) {
            const count = await SshDevice.count({ where: { empresa_id: empresaId } });
            if (count >= limites.limite_equipamentos) {
              sendValidationError(res, `Limite de equipamentos do plano atingido (${limites.limite_equipamentos}).`);
              return;
            }
          }
          const willHaveTunel = normalizeOptionalAgentId(value.agent_id) != null;
          if (willHaveTunel && limites.limite_tuneis > 0) {
            const countTuneis = await SshDevice.count({
              where: { [Op.and]: [{ empresa_id: empresaId }, literal('agent_id IS NOT NULL')] },
            });
            if (countTuneis >= limites.limite_tuneis) {
              sendValidationError(res, `Limite de túneis do plano atingido (${limites.limite_tuneis}).`);
              return;
            }
          }
          const willHaveBackup = value.backup_enabled === true;
          if (willHaveBackup && limites.limite_backups > 0) {
            const countBackups = await SshDevice.count({ where: { empresa_id: empresaId, backup_enabled: true } });
            if (countBackups >= limites.limite_backups) {
              sendValidationError(res, `Limite de backups do plano atingido (${limites.limite_backups}).`);
              return;
            }
          }
        }
      }
      const { empresa_id: _e, agent_id: _agentRaw, ...restValue } = value;
      const agent_id = normalizeOptionalAgentId(value.agent_id);
      const device = await SshDevice.create({
        ...restValue,
        empresa_id: resolved.empresa_id,
        agent_id,
        cliente_id: value.cliente_id ?? null,
        password: encrypt(value.password),
        private_key: value.private_key ? encrypt(normalizeSshPrivateKeyPem(value.private_key)) : null,
      });

      try {
        const dados = device.toJSON() as Record<string, unknown>;
        delete dados.password;
        delete dados.private_key;
        delete dados.id;
        await registrarCriacao(req as AuthenticatedRequest, 'SshDevice', 0, { ...dados, entity_id_str: device.id }, undefined, resolved.empresa_id ?? undefined);
      } catch { /* não crítico */ }

      sendSuccess(res, device, 'Device SSH criado com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar device SSH', 500, true, { context: 'DeviceController.store' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }

      const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        sendValidationError(res, error.details.map((d) => d.message).join('; '));
        return;
      }

      const devEmpresaId = device.empresa_id;
      if (devEmpresaId != null && (value.agent_id !== undefined || value.backup_enabled !== undefined)) {
        const limites = await getEquipamentosLimites(devEmpresaId);
        if (limites !== null && limites.temModulo) {
            const willHaveTunel =
              value.agent_id !== undefined
                ? normalizeOptionalAgentId(value.agent_id) != null
                : device.agent_id != null;
          if (willHaveTunel && limites.limite_tuneis > 0) {
            const countTuneis = await SshDevice.count({
              where: { [Op.and]: [{ empresa_id: devEmpresaId }, literal('agent_id IS NOT NULL')] },
            });
            const isAddingTunel = !device.agent_id && willHaveTunel;
            if (isAddingTunel && countTuneis >= limites.limite_tuneis) {
              sendValidationError(res, `Limite de túneis do plano atingido (${limites.limite_tuneis}).`);
              return;
            }
          }
          const willHaveBackup = value.backup_enabled !== undefined ? value.backup_enabled === true : !!device.backup_enabled;
          if (willHaveBackup && limites.limite_backups > 0) {
            const countBackups = await SshDevice.count({ where: { empresa_id: devEmpresaId, backup_enabled: true } });
            const isEnablingBackup = !device.backup_enabled && willHaveBackup;
            if (isEnablingBackup && countBackups >= limites.limite_backups) {
              sendValidationError(res, `Limite de backups do plano atingido (${limites.limite_backups}).`);
              return;
            }
          }
        }
      }

      const updateData: Partial<typeof value> = { ...value };
      if (value.agent_id === undefined) {
        delete (updateData as { agent_id?: unknown }).agent_id;
      } else {
        (updateData as { agent_id?: number | null }).agent_id = normalizeOptionalAgentId(value.agent_id);
      }
      if (value.password) updateData.password = encrypt(value.password);
      if (value.private_key) updateData.private_key = encrypt(normalizeSshPrivateKeyPem(value.private_key));
      if (value.private_key === null || value.private_key === '') updateData.private_key = null;

      if (value.host || value.port || value.username || value.password || value.agent_id !== undefined) {
        sshPool.releaseDevice(device.id);
      }

      const dadosAntes = device.toJSON() as Record<string, unknown>;
      delete dadosAntes.password;
      delete dadosAntes.private_key;
      delete dadosAntes.id;
      await device.update(updateData);
      try {
        const dadosDepois = device.toJSON() as Record<string, unknown>;
        delete dadosDepois.password;
        delete dadosDepois.private_key;
        delete dadosDepois.id;
        await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { ...dadosAntes, entity_id_str: device.id }, { ...dadosDepois, entity_id_str: device.id }, undefined, empresaId ?? undefined);
      } catch { /* não crítico */ }
      sendSuccess(res, device, 'Device SSH atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar device SSH', 500, true, { context: 'DeviceController.update' });
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }

      const backupCount = await SshDeviceBackup.count({ where: { ssh_device_id: device.id } });
      if (backupCount > 0) {
        sendValidationError(
          res,
          `Não é possível excluir o equipamento: existem ${backupCount} backup(s) salvos. Exclua todos os backups antes de remover o equipamento.`
        );
        return;
      }

      const dadosAntes = device.toJSON() as Record<string, unknown>;
      delete dadosAntes.password;
      delete dadosAntes.private_key;
      delete dadosAntes.id;
      sshPool.releaseDevice(device.id);
      await device.destroy();
      try {
        await registrarExclusao(req as AuthenticatedRequest, 'SshDevice', 0, { ...dadosAntes, entity_id_str: device.id }, undefined, empresaId ?? undefined);
      } catch { /* não crítico */ }

      sendSuccess(res, null, 'Device SSH removido com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao remover device SSH', 500, true, { context: 'DeviceController.destroy' });
    }
  }

  static async testConnection(req: Request, res: Response): Promise<void> {
    const deviceId = parseInt(req.params.id, 10);
    let deviceName = 'unknown';

    try {
      const device = await SshDevice.findByPk(deviceId);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }

      deviceName = device.name;

      if (device.device_type === 'swos') {
        const msg =
          'MikroTik (SwOS) não usa SSH: gerenciamento e backup são pela interface web (HTTP), como no Oxidized. Teste de conexão SSH não se aplica a este tipo.';
        logger.info('DeviceController.testConnection: SwOS — sem SSH', { deviceId, deviceName });
        sendSuccess(res, { success: false, latency: null, error: msg });
        return;
      }

      logger.info('DeviceController.testConnection: início', {
        deviceId,
        deviceName,
        host: device.host,
        port: device.port,
        deviceType: device.device_type,
        viaAgent: Boolean(device.agent_id),
        agentId: device.agent_id ?? null,
        userId: getUserId(req),
        ip: getClientIp(req),
      });

      if (device.agent_id) {
        const agentRow = await Agent.findByPk(device.agent_id);
        if (!agentRow || !agentRow.is_active) {
          const msg = 'Agente não encontrado ou inativo.';
          logger.warn('DeviceController.testConnection: falha pré-SSH', { deviceId, deviceName, reason: msg });
          logSshAudit({
            action: 'AUTH_FAIL',
            userId: getUserId(req),
            empresaId: device.empresa_id ?? null,
            deviceId,
            deviceName,
            success: false,
            errorMessage: msg,
            ip: getClientIp(req),
          });
          try {
            await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${msg})`, getEmpresaIdOrNull(req) ?? undefined);
          } catch { /* não crítico */ }
          sendSuccess(res, { success: false, latency: null, error: msg });
          return;
        }
        if (!isAgentOnline(device.agent_id)) {
          const msg =
            'Agente offline. O teste de conexão usa o mesmo túnel do terminal — mantenha o agente conectado.';
          logger.warn('DeviceController.testConnection: falha pré-SSH', {
            deviceId,
            deviceName,
            agentId: device.agent_id,
            reason: 'agente offline',
          });
          logSshAudit({
            action: 'AUTH_FAIL',
            userId: getUserId(req),
            empresaId: device.empresa_id ?? null,
            deviceId,
            deviceName,
            success: false,
            errorMessage: msg,
            ip: getClientIp(req),
          });
          try {
            await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${msg})`, getEmpresaIdOrNull(req) ?? undefined);
          } catch { /* não crítico */ }
          sendSuccess(res, { success: false, latency: null, error: msg });
          return;
        }

        let password: string;
        try {
          password = decryptSshCredential(device.password, 'senha');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro ao descriptografar credenciais do device.';
          logger.warn('DeviceController.testConnection: falha ao descriptografar credenciais', {
            deviceId,
            deviceName,
            error: msg,
          });
          logSshAudit({
            action: 'AUTH_FAIL',
            userId: getUserId(req),
            empresaId: device.empresa_id ?? null,
            deviceId,
            deviceName,
            success: false,
            errorMessage: msg,
            ip: getClientIp(req),
          });
          try {
            await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${msg})`, getEmpresaIdOrNull(req) ?? undefined);
          } catch { /* não crítico */ }
          sendSuccess(res, { success: false, latency: null, error: msg });
          return;
        }

        let privateKey: string | undefined;
        if (device.private_key) {
          try {
            privateKey = privateKeyPemForSsh2(decryptSshCredential(device.private_key, 'chave_privada'));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao descriptografar chave privada.';
            logger.warn('DeviceController.testConnection: falha ao descriptografar chave privada', {
              deviceId,
              deviceName,
              error: msg,
            });
            logSshAudit({
              action: 'AUTH_FAIL',
              userId: getUserId(req),
              empresaId: device.empresa_id ?? null,
              deviceId,
              deviceName,
              success: false,
              errorMessage: msg,
              ip: getClientIp(req),
            });
            try {
              await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${msg})`, getEmpresaIdOrNull(req) ?? undefined);
            } catch { /* não crítico */ }
            sendSuccess(res, { success: false, latency: null, error: msg });
            return;
          }
        }
        const useKey = !!privateKey?.length;

        const viaAgent = await testSshThroughAgent(device.agent_id, {
          host: device.host,
          port: device.port,
          username: device.username,
          deviceType: device.device_type,
          ...(useKey && privateKey ? { privateKey } : { password }),
        });

        if (viaAgent.success) {
          logger.info('DeviceController.testConnection: OK via agente', {
            deviceId,
            deviceName,
            agentId: device.agent_id,
            latencyMs: viaAgent.latency,
          });
          logSshAudit({
            action: 'CONNECT',
            userId: getUserId(req),
            empresaId: device.empresa_id ?? null,
            deviceId,
            deviceName,
            success: true,
            ip: getClientIp(req),
            duration: viaAgent.latency ?? undefined,
          });
          try {
            await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, 'Teste de conexão no equipamento', getEmpresaIdOrNull(req) ?? undefined);
          } catch { /* não crítico */ }
          sendSuccess(res, {
            success: true,
            latency: viaAgent.latency,
            error: null,
          });
          return;
        }

        const errorMsg = buildFriendlyError(
          new Error(viaAgent.errorRaw ?? 'Falha na conexão SSH')
        );
        logger.warn('DeviceController.testConnection: falha SSH via agente', {
          deviceId,
          deviceName,
          agentId: device.agent_id,
          error: errorMsg,
        });
        logSshAudit({
          action: 'AUTH_FAIL',
          userId: getUserId(req),
          empresaId: device.empresa_id ?? null,
          deviceId,
          deviceName,
          success: false,
          errorMessage: errorMsg,
          ip: getClientIp(req),
        });
        try {
          await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${errorMsg})`, getEmpresaIdOrNull(req) ?? undefined);
        } catch { /* não crítico */ }
        sendSuccess(res, { success: false, latency: null, error: errorMsg });
        return;
      }

      const start = Date.now();
      logger.info('DeviceController.testConnection: conexão direta ao host', { deviceId, deviceName, host: device.host });
      const conn = await openDeviceConnection(device);
      const latency = Date.now() - start;
      conn.end();

      logger.info('DeviceController.testConnection: OK conexão direta', { deviceId, deviceName, latencyMs: latency });
      logSshAudit({
        action: 'CONNECT',
        userId: getUserId(req),
        empresaId: device.empresa_id ?? null,
        deviceId,
        deviceName,
        success: true,
        ip: getClientIp(req),
        duration: latency,
      });

      try {
        await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { id: deviceId, name: deviceName }, { id: deviceId, name: deviceName }, 'Teste de conexão no equipamento', getEmpresaIdOrNull(req) ?? undefined);
      } catch { /* não crítico */ }

      sendSuccess(res, { success: true, latency, error: null });
    } catch (err) {
      const errorMsg = buildFriendlyError(err instanceof Error ? err : new Error(String(err)));
      const deviceForAudit = await SshDevice.findByPk(deviceId).catch(() => null);

      logger.warn('DeviceController.testConnection: exceção', {
        deviceId,
        deviceName,
        error: errorMsg,
        cause: err instanceof Error ? err.message : String(err),
      });

      logSshAudit({
        action: 'AUTH_FAIL',
        userId: getUserId(req),
        empresaId: deviceForAudit?.empresa_id ?? null,
        deviceId,
        deviceName,
        success: false,
        errorMessage: errorMsg,
        ip: getClientIp(req),
      });

      try {
        await registrarAtualizacao(req as AuthenticatedRequest, 'SshDevice', 0, { entity_id_str: deviceId, name: deviceName }, { entity_id_str: deviceId, name: deviceName }, `Teste de conexão no equipamento (falha: ${errorMsg})`, getEmpresaIdOrNull(req) ?? undefined);
      } catch { /* não crítico */ }

      sendSuccess(res, { success: false, latency: null, error: errorMsg });
    }
  }

  static async executeCommand(req: Request, res: Response): Promise<void> {
    const deviceId = parseInt(req.params.id, 10);

    try {
      const device = await SshDevice.findByPk(deviceId);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }

      const { command } = req.body as { command?: string };
      if (!command?.trim()) {
        sendValidationError(res, 'O campo "command" é obrigatório');
        return;
      }

      const start = Date.now();
      const conn = await sshPool.getDeviceConnection(device);
      const output = await executeCommand(conn, command.trim(), device.id);
      const duration = Date.now() - start;

      logSshAudit({
        action: 'COMMAND',
        userId: getUserId(req),
        empresaId: device.empresa_id ?? null,
        deviceId: device.id,
        deviceName: device.name,
        command: command.trim(),
        output,
        success: true,
        ip: getClientIp(req),
        duration,
      });

      sendSuccess(res, { output, duration });
    } catch (err) {
      const device = await SshDevice.findByPk(deviceId).catch(() => null);
      const errorMsg = buildFriendlyError(err instanceof Error ? err : new Error(String(err)));

      logSshAudit({
        action: 'COMMAND',
        userId: getUserId(req),
        empresaId: device?.empresa_id ?? null,
        deviceId,
        deviceName: device?.name ?? 'unknown',
        command: (req.body as { command?: string }).command ?? null,
        success: false,
        errorMessage: errorMsg,
        ip: getClientIp(req),
      });

      sendError(res, err, errorMsg, 500, true, { context: 'DeviceController.executeCommand' });
    }
  }

  /** Backup manual imediato (não exige backup_enabled). RouterOS/Huawei via SSH; SwOS via HTTP GET /backup.swb (direto ou pelo agente). */
  static async queueManualBackup(req: Request, res: Response): Promise<void> {
    try {
      const deviceId = req.params.id;
      const device = await SshDevice.findByPk(deviceId);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }

      if (!device.is_active) {
        sendValidationError(res, 'Device inativo não pode receber backup.');
        return;
      }
      if (device.agent_id) {
        const agentRow = await Agent.findByPk(device.agent_id);
        if (!agentRow || !agentRow.is_active) {
          sendValidationError(res, 'Agente não encontrado ou inativo.');
          return;
        }
        if (!isAgentOnline(device.agent_id)) {
          sendValidationError(
            res,
            'Agente offline. Mantenha o túnel conectado para o backup via agente.'
          );
          return;
        }
      }
      if (device.device_type !== 'mikrotik' && device.device_type !== 'huawei' && device.device_type !== 'swos') {
        sendValidationError(res, 'Backup não suportado para este tipo de equipamento.');
        return;
      }

      const userId = getUserId(req);
      const ip = getClientIp(req);
      logger.info('Backup SSH manual: executando', {
        context: 'DeviceController.queueManualBackup',
        deviceId: device.id,
        deviceName: device.name,
        userId,
        ip,
      });

      const result = await runSshDeviceBackup(device.id, {
        manual: true,
        userId,
        ip,
      });

      if (!result.success) {
        sendError(res, new Error(result.message), result.message, 500, true, {
          context: 'DeviceController.queueManualBackup',
        });
        return;
      }

      try {
        await registrarCriacao(req as AuthenticatedRequest, 'SshDeviceBackup', 0, { deviceId: device.id, deviceName: device.name, message: result.message }, `Backup manual do equipamento ${device.name}`, empresaId ?? undefined);
      } catch { /* não crítico */ }
      sendSuccess(res, { message: result.message }, result.message);
    } catch (error) {
      logger.error('Backup SSH manual: falha ao executar', {
        context: 'DeviceController.queueManualBackup',
        deviceId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      sendError(res, error, 'Erro ao enfileirar backup', 500, true, {
        context: 'DeviceController.queueManualBackup',
      });
    }
  }

  /** Lista arquivos de backup gravados no disco para o device. */
  static async listDeviceBackups(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const items = await listBackupsForDevice(device.id);
      sendSuccess(res, items);
    } catch (error) {
      sendError(res, error, 'Erro ao listar backups do device', 500, true, {
        context: 'DeviceController.listDeviceBackups',
      });
    }
  }

  /** Remove backup do device (query `nome` = nome exato do arquivo). */
  static async deleteDeviceBackup(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const nome = typeof req.query.nome === 'string' ? req.query.nome : '';
      if (!nome.trim()) {
        sendValidationError(res, 'Parâmetro "nome" é obrigatório');
        return;
      }
      const removed = await deleteBackupStorage(device.id, nome.trim());
      if (!removed) {
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      sendSuccess(res, null, 'Backup excluído');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir backup', 500, true, {
        context: 'DeviceController.deleteDeviceBackup',
      });
    }
  }

  /** Download de um arquivo de backup (query `nome` = nome exato do arquivo). */
  static async downloadDeviceBackup(req: Request, res: Response): Promise<void> {
    try {
      const device = await SshDevice.findByPk(req.params.id);
      if (!device) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const empresaId = getEmpresaIdOrNull(req);
      if (!canAccessDevice(device, empresaId)) {
        sendNotFound(res, 'Device SSH não encontrado');
        return;
      }
      const nome = typeof req.query.nome === 'string' ? req.query.nome : '';
      if (!nome.trim()) {
        sendValidationError(res, 'Parâmetro "nome" é obrigatório');
        return;
      }
      const fullPath = await resolveBackupFileForDownload(device.id, nome.trim());
      if (!fullPath) {
        sendNotFound(res, 'Arquivo de backup não encontrado');
        return;
      }
      res.download(fullPath, nome.trim(), (err) => {
        if (err) {
          logger.error('Erro ao enviar backup SSH', {
            context: 'DeviceController.downloadDeviceBackup',
            error: err.message,
          });
        }
      });
    } catch (error) {
      sendError(res, error, 'Erro ao baixar backup', 500, true, {
        context: 'DeviceController.downloadDeviceBackup',
      });
    }
  }

  /** Lista backups de todos os devices SSH do cliente (flat, com device_id / device_name). */
  static async listBackupsByCliente(req: Request, res: Response): Promise<void> {
    try {
      const clienteId = parseClienteIdQuery(req.query.cliente_id);
      if (clienteId == null) {
        sendValidationError(res, 'Parâmetro cliente_id é obrigatório');
        return;
      }

      const scopeEmpresaId = resolveEmpresaScopeForList(req, parseEmpresaIdQuery(req.query.empresa_id));
      const parts: WhereOptions<SshDevice>[] = [{ cliente_id: clienteId }];
      if (scopeEmpresaId != null) {
        parts.push({ [Op.or]: [{ empresa_id: scopeEmpresaId }, { empresa_id: null }] });
      }
      const where: WhereOptions<SshDevice> =
        parts.length === 1 ? parts[0]! : { [Op.and]: parts };

      const devices = await SshDevice.findAll({
        where,
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
      });

      const idToName = new Map(devices.map((d) => [d.id, d.name] as const));
      const deviceIds = devices.map((d) => d.id);
      const flat = await listBackupsForDeviceIds(deviceIds, idToName);
      sendSuccess(res, flat);
    } catch (error) {
      sendError(res, error, 'Erro ao listar backups do cliente', 500, true, {
        context: 'DeviceController.listBackupsByCliente',
      });
    }
  }

  /**
   * Horário da rotina de backup SSH no agendador SaaS (escopo ERP global).
   */
  static async backupAgendamento(_req: Request, res: Response): Promise<void> {
    try {
      const routine = await SaasScheduledRoutine.findOne({
        where: {
          tipo: 'backup_equipamentos_ssh',
          alvo: 'erp_global',
          ativo: true
        },
        order: [['id', 'ASC']],
        attributes: ['minuto', 'hora', 'proxima_execucao']
      });

      if (!routine) {
        sendSuccess(res, {
          configurado: false,
          hora_execucao: null,
          frequencia: null,
          proxima_execucao: null
        });
        return;
      }

      const minRaw = routine.getDataValue('minuto') as unknown;
      const hourRaw = routine.getDataValue('hora') as unknown;
      let horaStr: string | null = null;
      const ms = typeof minRaw === 'string' ? minRaw.trim() : '';
      const hs = typeof hourRaw === 'string' ? hourRaw.trim() : '';
      if (/^\d+$/.test(ms) && /^\d+$/.test(hs)) {
        const mm = Math.min(59, Math.max(0, parseInt(ms, 10)));
        const hh = Math.min(23, Math.max(0, parseInt(hs, 10)));
        horaStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }

      sendSuccess(res, {
        configurado: true,
        hora_execucao: horaStr,
        frequencia: 'personalizada',
        proxima_execucao: routine.proxima_execucao
      });
    } catch (error) {
      sendError(res, error, 'Erro ao obter agendamento de backup', 500, true, {
        context: 'DeviceController',
        action: 'backupAgendamento'
      });
    }
  }
}
