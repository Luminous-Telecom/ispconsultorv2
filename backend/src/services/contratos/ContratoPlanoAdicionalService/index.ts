import { ContratoPlanoAdicional } from '../../../models/contratos/ContratoPlanoAdicional';
import { Plano } from '../../../models/cadastros/Plano';

export class ContratoPlanoAdicionalService {
  /**
   * Listar planos adicionais por contrato
   */
  static async getByContrato(contratoId: number): Promise<ContratoPlanoAdicional[]> {
    return await ContratoPlanoAdicional.findAll({
      where: { contrato_id: contratoId },
      include: [
        {
          association: 'plano',
          attributes: ['id', 'nome_plano', 'descricao', 'tipo_servico', 'valor_mensal', 'status']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Buscar plano adicional por ID
   */
  static async getById(id: string | number, includePlano = false): Promise<ContratoPlanoAdicional | null> {
    const include = includePlano ? [
      {
        association: 'plano',
        attributes: ['id', 'nome_plano', 'descricao', 'tipo_servico', 'valor_mensal', 'status']
      }
    ] : [];

    return await ContratoPlanoAdicional.findByPk(id, {
      include
    });
  }

  /**
   * Buscar plano adicional existente
   */
  static async findOne(where: any): Promise<ContratoPlanoAdicional | null> {
    // Se where já contém a propriedade 'where', usar diretamente, senão criar o objeto
    const queryOptions = where && 'where' in where ? where : { where };
    return await ContratoPlanoAdicional.findOne(queryOptions);
  }

  /**
   * Criar plano adicional
   */
  static async create(dados: Partial<ContratoPlanoAdicional>, transaction?: any): Promise<ContratoPlanoAdicional> {
    return await ContratoPlanoAdicional.create(dados as any, { transaction });
  }

  /**
   * Atualizar plano adicional
   */
  static async update(id: string | number, dados: Partial<ContratoPlanoAdicional>): Promise<ContratoPlanoAdicional> {
    const servico = await ContratoPlanoAdicional.findByPk(id);
    
    if (!servico) {
      throw new Error('Plano adicional não encontrado');
    }
    
    await servico.update(dados);
    await servico.reload();
    
    return servico;
  }

  /**
   * Deletar plano adicional
   */
  static async delete(id: string | number): Promise<ContratoPlanoAdicional> {
    const servico = await ContratoPlanoAdicional.findByPk(id);
    
    if (!servico) {
      throw new Error('Plano adicional não encontrado');
    }
    
    await servico.destroy();
    
    return servico;
  }
}

