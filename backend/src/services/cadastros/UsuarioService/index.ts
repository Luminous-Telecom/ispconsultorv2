import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { sortDirection } from '../prismaWhere';

export interface ListUsuariosFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

const SORT_COLUMNS = ['id', 'nome', 'email', 'role', 'ativo', 'ultimo_login', 'created_at', 'updated_at', 'empresa_id'] as const;

type UsuarioSensitive = {
  password_hash?: string;
  totp_secret_encrypted?: string | null;
  totp_temp_secret_encrypted?: string | null;
  totp_recovery_hashes?: string | null;
  email_otp_hash?: string | null;
  email_otp_expires_at?: Date | null;
  email_recuperacao_token_hash?: string | null;
  email_recuperacao_token_expires?: Date | null;
  password_reset_token_hash?: string | null;
  password_reset_token_expires?: Date | null;
};

function withoutPassword<T extends UsuarioSensitive>(usuario: T) {
  const {
    password_hash: _passwordHash,
    totp_secret_encrypted: _totpSecret,
    totp_temp_secret_encrypted: _totpTemp,
    totp_recovery_hashes: _totpRecovery,
    email_otp_hash: _emailOtp,
    email_otp_expires_at: _emailOtpExp,
    email_recuperacao_token_hash: _emailRecToken,
    email_recuperacao_token_expires: _emailRecExp,
    password_reset_token_hash: _pwdResetToken,
    password_reset_token_expires: _pwdResetExp,
    ...safe
  } = usuario;
  return safe;
}

export class UsuarioService {
  static async list(filters: ListUsuariosFilters) {
    const { page = 1, limit = 10, search = '', searchField, ativo, sortColumn, sortDirection: direction, empresa_id } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const where: Prisma.cadastros_usuariosWhereInput = {};
    if (empresa_id !== undefined) where.empresa_id = empresa_id;

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.cadastros_usuariosWhereInput[] = [];
      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'nome' || searchField === 'email' || searchField === 'role') {
        orConditions = [{ [searchField]: { contains: search } }];
      } else {
        orConditions = [
          { nome: { contains: search } },
          { email: { contains: search } },
          { role: { contains: search } },
        ];
        if (numExact !== null) orConditions.unshift({ id: numExact });
      }
      where.OR = orConditions;
    }

    if (ativo !== undefined) where.ativo = ativo === 'true';

    const dir = sortDirection(direction);
    const orderBy: Prisma.cadastros_usuariosOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };
    if (sortColumn && !(SORT_COLUMNS as readonly string[]).includes(sortColumn)) {
      logger.warn('UsuarioService.list - Coluna de ordenação inválida', { column: sortColumn });
    }

    const [count, rows] = await Promise.all([
      prisma.cadastros_usuarios.count({ where }),
      prisma.cadastros_usuarios.findMany({ where, orderBy, take: limitNum, skip: offset }),
    ]);

    return {
      success: true,
      data: rows.map(withoutPassword),
      pagination: buildPagination(pageNum, limitNum, count),
    };
  }

  static async getById(id: string | number) {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: Number(id) } });
    return usuario ? withoutPassword(usuario) : null;
  }

  static async findByEmailWithPassword(email: string, ativo = true) {
    return prisma.cadastros_usuarios.findFirst({
      where: { email: email.toLowerCase(), ativo },
    });
  }

  static async findByIdWithPassword(id: number, ativo = true) {
    return prisma.cadastros_usuarios.findFirst({
      where: { id, ...(ativo ? { ativo: true } : {}) },
    });
  }

  static async findByWebhookSecret(secret: string) {
    const usuario = await prisma.cadastros_usuarios.findFirst({
      where: { webhook_secret: secret },
    });
    return usuario ? withoutPassword(usuario) : null;
  }

  static async updateUltimoLogin(id: number) {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id } });
    if (!usuario) throw new Error('Usuário não encontrado');
    const updated = await prisma.cadastros_usuarios.update({
      where: { id },
      data: { ultimo_login: new Date() },
    });
    return withoutPassword(updated);
  }

  static async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const usuario = await prisma.cadastros_usuarios.findFirst({
      where: {
        email,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!usuario;
  }

  static async create(dadosUsuario: {
    nome: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
    ativo?: boolean;
    empresa_id?: number;
  }) {
    const passwordHash = await bcrypt.hash(dadosUsuario.password, 10);
    const created = await prisma.cadastros_usuarios.create({
      data: {
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        password_hash: passwordHash,
        role: dadosUsuario.role || 'admin',
        ativo: dadosUsuario.ativo !== undefined ? dadosUsuario.ativo : true,
        empresa_id: dadosUsuario.empresa_id ?? null,
      },
    });
    return withoutPassword(created);
  }

  static async update(id: string | number, dadosUsuario: {
    nome?: string;
    email?: string;
    password?: string;
    role?: 'admin' | 'user';
    ativo?: boolean;
    webhook_secret?: string;
  }) {
    const numericId = Number(id);
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: numericId } });
    if (!usuario) throw new Error('Usuário não encontrado');

    const updateData: Prisma.cadastros_usuariosUncheckedUpdateInput = {};
    if (dadosUsuario.nome) updateData.nome = dadosUsuario.nome;
    if (dadosUsuario.email) updateData.email = dadosUsuario.email;
    if (dadosUsuario.role) updateData.role = dadosUsuario.role;
    if (dadosUsuario.ativo !== undefined) updateData.ativo = dadosUsuario.ativo;
    if (dadosUsuario.webhook_secret) updateData.webhook_secret = dadosUsuario.webhook_secret;
    if (dadosUsuario.password) updateData.password_hash = await bcrypt.hash(dadosUsuario.password, 10);

    const updated = await prisma.cadastros_usuarios.update({
      where: { id: numericId },
      data: updateData,
    });
    return withoutPassword(updated);
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: numericId } });
    if (!usuario) throw new Error('Usuário não encontrado');
    await prisma.cadastros_usuarios.delete({ where: { id: numericId } });
    return withoutPassword(usuario);
  }
}
