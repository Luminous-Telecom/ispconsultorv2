import { HotsitePlanoPublico } from '../../../utils/saasPlanoHotsiteUtils';

export class SaasPlanoService {
  static async list(): Promise<any[]> {
    return [];
  }

  static async listForHotsite(): Promise<HotsitePlanoPublico[]> {
    return [];
  }

  static async getById(_id: number): Promise<any> {
    return null;
  }

  static async create(_data: Record<string, unknown>): Promise<any> {
    return null;
  }

  static async update(_id: number, _data: Record<string, unknown>): Promise<void> {
    return;
  }

  static async delete(_id: number): Promise<void> {
    return;
  }
}
