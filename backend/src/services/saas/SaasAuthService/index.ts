import bcrypt from 'bcryptjs';

export class SaasAuthService {
  static async findByEmail(_email: string): Promise<any> {
    return null;
  }

  static async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  static async updateUltimoLogin(_id: number): Promise<void> {
    return;
  }

  static async updateSenha(_id: number, _novaSenha: string): Promise<void> {
    return;
  }

  static async getById(_id: number): Promise<any> {
    return null;
  }
}
