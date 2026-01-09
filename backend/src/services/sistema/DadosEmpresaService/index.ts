import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';

export class DadosEmpresaService {
  /**
   * Buscar dados da empresa (único registro)
   */
  static async findOne(): Promise<DadosEmpresa | null> {
    return await DadosEmpresa.findOne();
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
    let dadosEmpresa = await DadosEmpresa.findOne();
    
    if (!dadosEmpresa) {
      throw new Error('Dados da empresa não encontrados');
    }
    
    await dadosEmpresa.update(dados);
    await dadosEmpresa.reload();
    
    return dadosEmpresa;
  }
}

