import bcrypt from 'bcryptjs';
import { SaasUsuarioSuper } from '../../../models/saas/SaasUsuarioSuper';

export class SaasAuthService {
  static async findByEmail(email: string): Promise<SaasUsuarioSuper | null> {
    return SaasUsuarioSuper.scope('withPassword').findOne({ where: { email } });
  }

  static async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  static async updateUltimoLogin(id: number): Promise<void> {
    await SaasUsuarioSuper.update({ ultimo_login: new Date() }, { where: { id } });
  }

  static async updateSenha(id: number, novaSenha: string): Promise<void> {
    const hash = await bcrypt.hash(novaSenha, 12);
    await SaasUsuarioSuper.update(
      { senha_hash: hash, precisa_trocar_senha: false },
      { where: { id } }
    );
  }

  static async getById(id: number): Promise<SaasUsuarioSuper | null> {
    return SaasUsuarioSuper.findByPk(id);
  }
}
