import { SaasPlano } from '../../../models/saas/SaasPlano';
import {
  HotsitePlanoPublico,
  serializeSaasPlanoForHotsite,
} from '../../../utils/saasPlanoHotsiteUtils';

export class SaasPlanoService {
  static async list(): Promise<SaasPlano[]> {
    return SaasPlano.findAll({ order: [['valor_mensal', 'ASC']] });
  }

  static async listForHotsite(): Promise<HotsitePlanoPublico[]> {
    const planos = await SaasPlano.findAll({
      where: { ativo: true, mostrar_hotsite: true },
      order: [['valor_mensal', 'ASC'], ['nome', 'ASC']],
    });
    return planos.map(serializeSaasPlanoForHotsite);
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
      updateData.recursos = data.recursos as Record<string, unknown>;
    }
    await SaasPlano.update(updateData, { where: { id } });
  }

  static async delete(id: number): Promise<void> {
    await SaasPlano.destroy({ where: { id } });
  }
}
