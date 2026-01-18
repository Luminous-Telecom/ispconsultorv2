import { Hotsite } from '../../../models/sistema/Hotsite';

export class HotsiteService {
  static async getCurrent(): Promise<Hotsite> {
    const hotsite = await Hotsite.findOne({ order: [['id', 'DESC']] });
    if (hotsite) return hotsite;

    return await Hotsite.create({
      html: '',
      ativo: true
    });
  }

  static async update(html: string): Promise<Hotsite> {
    const current = await this.getCurrent();
    await current.update({ html: html ?? '' });
    await current.reload();
    return current;
  }
}

