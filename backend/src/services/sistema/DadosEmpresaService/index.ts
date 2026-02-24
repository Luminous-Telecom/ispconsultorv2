import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { cache } from '../../../utils/cache';
import { slugify } from '../../../utils/slugify';

export class DadosEmpresaService {
  /**
   * Buscar dados da empresa (único registro)
   */
  static async findOne(): Promise<DadosEmpresa | null> {
    const cacheKey = 'dados_empresa:config';
    const cached = cache.get<DadosEmpresa>(cacheKey);
    if (cached) {
      return cached;
    }

    const dados = await DadosEmpresa.findOne();
    if (dados) {
      cache.set(cacheKey, dados, 600000); // Cache por 10 minutos
    }
    return dados;
  }

  /**
   * Buscar empresa pelo slug derivado de nome_fantasia ou razao_social
   */
  static async findBySlug(slug: string): Promise<DadosEmpresa | null> {
    const all = await DadosEmpresa.findAll();
    return all.find(e => slugify(e.nome_fantasia || e.razao_social || '') === slug) ?? null;
  }

  /**
   * Criar dados da empresa
   */
  static async create(dados: Partial<DadosEmpresa>): Promise<DadosEmpresa> {
    return await DadosEmpresa.create(dados as any);
  }

  /**
   * Atualizar dados da empresa
   */
  static async update(dados: Partial<DadosEmpresa>): Promise<DadosEmpresa> {
    const dadosEmpresa = await DadosEmpresa.findOne();
    
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não encontrados');
    }
    
    await dadosEmpresa.update(dados);
    await dadosEmpresa.reload();
    
    cache.delete('dados_empresa:config');
    return dadosEmpresa;
  }
}

