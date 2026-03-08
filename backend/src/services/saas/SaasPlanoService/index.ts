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
    const updateData = { ...data };
    if (data.recursos != null && typeof data.recursos === 'object') {
      const modulos = (data.recursos as Record<string, unknown>)?.modulos;
      updateData.recursos = { modulos };
    }
    await SaasPlano.update(updateData, { where: { id } });
  }

  static async delete(id: number): Promise<void> {
    await SaasPlano.destroy({ where: { id } });
  }
}
