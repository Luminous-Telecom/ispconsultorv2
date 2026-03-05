import { SaasPlano } from '../../../models/saas/SaasPlano';

export class SaasPlanoService {
  static async list(): Promise<SaasPlano[]> {
    return SaasPlano.findAll({ order: [['valor_mensal', 'ASC']] });
  }

  static async getById(id: number): Promise<SaasPlano | null> {
    return SaasPlano.findByPk(id);
  }

  static async create(data: Partial<SaasPlano>): Promise<SaasPlano> {
    return SaasPlano.create(data as SaasPlano['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasPlano>): Promise<void> {
    await SaasPlano.update(data, { where: { id } });
  }

  static async delete(id: number): Promise<void> {
    await SaasPlano.destroy({ where: { id } });
  }
}
