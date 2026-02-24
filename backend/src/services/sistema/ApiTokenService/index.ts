import crypto from 'crypto';
import { ApiToken } from '../../../models/sistema/ApiToken';

export interface CreateApiTokenData {
  empresa_id: number;
  nome: string;
  criado_por?: number;
}

export interface ApiTokenCreated {
  token: ApiToken;
  tokenPlain: string;
}

export class ApiTokenService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static generateToken(): string {
    const bytes = crypto.randomBytes(32);
    return `bkn_${bytes.toString('hex')}`;
  }

  static async list(empresa_id: number): Promise<ApiToken[]> {
    return ApiToken.findAll({
      where: { empresa_id },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'nome', 'token_prefix', 'ativo', 'ultimo_uso', 'criado_por', 'created_at', 'updated_at']
    });
  }

  static async create(data: CreateApiTokenData): Promise<ApiTokenCreated> {
    const tokenPlain = this.generateToken();
    const tokenHash = this.hashToken(tokenPlain);
    const tokenPrefix = tokenPlain.substring(0, 12);

    const token = await ApiToken.create({
      empresa_id: data.empresa_id,
      nome: data.nome,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      criado_por: data.criado_por ?? null,
      ativo: true
    });

    return { token, tokenPlain };
  }

  static async revoke(id: number, empresa_id: number): Promise<boolean> {
    const token = await ApiToken.findOne({ where: { id, empresa_id } });
    if (!token) return false;
    await token.destroy();
    return true;
  }

  static async validateToken(tokenPlain: string): Promise<ApiToken | null> {
    if (!tokenPlain.startsWith('bkn_')) return null;

    const tokenHash = this.hashToken(tokenPlain);
    const token = await ApiToken.findOne({
      where: { token_hash: tokenHash, ativo: true }
    });

    if (!token) return null;

    await token.update({ ultimo_uso: new Date() });

    return token;
  }
}
