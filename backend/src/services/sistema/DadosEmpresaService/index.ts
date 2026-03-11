import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { cache } from '../../../utils/cache';
import { slugify } from '../../../utils/slugify';

export class DadosEmpresaService {
  /**
   * Buscar dados da empresa. Se empresaId for fornecido, filtra por id (multi-tenant).
   * Caso contrário, retorna o primeiro registro (legado para superadmin).
   */
  static async findOne(empresaId?: number): Promise<DadosEmpresa | null> {
    const cacheKey = empresaId != null ? `dados_empresa:config:${empresaId}` : 'dados_empresa:config';
    const cached = cache.get<DadosEmpresa>(cacheKey);
    if (cached) {
      return cached;
    }

    const where = empresaId != null ? { where: { id: empresaId } } : {};
    const dados = await DadosEmpresa.findOne(where);
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
   * Atualizar dados da empresa. Se empresaId for fornecido, filtra por id (multi-tenant).
   */
  static async update(dados: Partial<DadosEmpresa>, empresaId?: number): Promise<DadosEmpresa> {
    const where = empresaId != null ? { where: { id: empresaId } } : {};
    const dadosEmpresa = await DadosEmpresa.findOne(where);

    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não encontrados');
    }

    await dadosEmpresa.update(dados);
    await dadosEmpresa.reload();

    const cacheKey = empresaId != null ? `dados_empresa:config:${empresaId}` : 'dados_empresa:config';
    cache.delete(cacheKey);
    return dadosEmpresa;
  }
}

