/**
 * Serviço público do Blockdomi - dados para o site público.
 * Retorna ofícios, datas de bloqueio, versões e totais (sem listas de domínios/IPs).
 */
import { Op } from 'sequelize';
import { Dominio } from '../../../models/blockdomi/Dominio';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';
import { IPv4 } from '../../../models/blockdomi/IPv4';
import { IPv6 } from '../../../models/blockdomi/IPv6';

export interface OficioPublico {
  nome_oficio: string | null;
  data_inicio_bloqueio: string | null;
  data_fim_bloqueio: string | null;
  versao: string | null;
}

export interface BlockdomiPublicoStats {
  total_dominios: number;
  total_ipv4: number;
  total_ipv6: number;
  total_urls: number;
}

export interface BlockdomiPublicoResponse {
  oficios: OficioPublico[];
  versao_atual: string | null;
  stats: BlockdomiPublicoStats;
}

export class BlockdomiPublicoService {
  /**
   * Lista ofícios distintos com nome, datas de bloqueio e versão.
   * Exclui domínios da resposta - apenas metadados.
   */
  static async listarDadosPublicos(): Promise<BlockdomiPublicoResponse> {
    const dominios = await Dominio.findAll({
      where: { ativo: true },
      attributes: ['nome_oficio', 'data_inicio_bloqueio', 'data_fim_bloqueio', 'versao_id'],
      include: [
        {
          model: VersaoBlockdomi,
          as: 'versaoRef',
          attributes: ['numero'],
          required: false
        }
      ],
      order: [
        ['data_inicio_bloqueio', 'DESC'],
        ['nome_oficio', 'ASC']
      ],
      raw: false
    });

    const seen = new Set<string>();
    const oficios: OficioPublico[] = [];

    for (const d of dominios) {
      const plain = d.get({ plain: true }) as Record<string, unknown>;
      const versaoRef = plain.versaoRef as { numero?: string } | undefined;
      const versao = versaoRef?.numero ?? null;
      const nomeOficio = (plain.nome_oficio as string | null) ?? null;
      const dataInicio = (plain.data_inicio_bloqueio as string | null) ?? null;
      const dataFim = (plain.data_fim_bloqueio as string | null) ?? null;

      const key = `${nomeOficio}|${dataInicio}|${dataFim}|${versao}`;
      if (seen.has(key)) continue;
      seen.add(key);

      oficios.push({
        nome_oficio: nomeOficio,
        data_inicio_bloqueio: dataInicio,
        data_fim_bloqueio: dataFim,
        versao
      });
    }

    const versaoAtual = await this.getVersaoAtual();

    const [totalDominios, totalIpv4, totalIpv6, totalUrls] = await Promise.all([
      Dominio.count({
        where: {
          ativo: true,
          dominio: { [Op.notLike]: '%/%' }
        }
      }),
      IPv4.count({ where: { ativo: true } }),
      IPv6.count({ where: { ativo: true } }),
      Dominio.count({
        where: {
          ativo: true,
          dominio: { [Op.like]: '%/%' }
        }
      })
    ]);

    const stats = {
      total_dominios: totalDominios,
      total_ipv4: totalIpv4,
      total_ipv6: totalIpv6,
      total_urls: totalUrls
    };

    return { oficios, versao_atual: versaoAtual, stats };
  }

  static async getVersaoAtual(): Promise<string | null> {
    const v = await VersaoBlockdomi.findOne({
      order: [['id', 'DESC']],
      attributes: ['numero'],
      raw: true
    });
    return v?.numero ?? null;
  }
}
