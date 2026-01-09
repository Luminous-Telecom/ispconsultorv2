import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Contrato } from '../../../models/contratos/Contrato';
import { Op } from 'sequelize';

export class DashboardService {
  /**
   * Buscar contratos do período
   */
  static async getContratosPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Contrato[]> {
    return await Contrato.findAll({ 
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'valor_final', 'data_inicio', 'data_fim', 'created_at'],
      where: {
        [Op.and]: [
          {
            data_inicio: {
              [Op.lte]: fimPeriodo
            }
          },
          {
            [Op.or]: [
              {
                data_fim: {
                  [Op.gte]: inicioPeriodo
                }
              },
              {
                data_fim: null
              }
            ]
          }
        ]
      }
    });
  }

  /**
   * Buscar contratos ativos
   */
  static async getContratosAtivos(): Promise<Contrato[]> {
    return await Contrato.findAll({
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'valor_final'],
      where: { status: 'ativo' },
      include: [
        {
          association: 'cliente',
          attributes: ['id', 'ativo']
        },
        {
          association: 'plano',
          attributes: ['id', 'nome_plano', 'valor_mensal']
        }
      ]
    });
  }

  /**
   * Buscar todos os contratos
   */
  static async getAllContratos(): Promise<Contrato[]> {
    return await Contrato.findAll({ 
      attributes: ['id', 'status', 'plano_id', 'cliente_id']
    });
  }

  /**
   * Buscar clientes do período
   */
  static async getClientesPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Cliente[]> {
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at'],
      where: {
        created_at: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      }
    });
  }

  /**
   * Buscar todos os clientes
   */
  static async getAllClientes(): Promise<Cliente[]> {
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at']
    });
  }

  /**
   * Buscar planos ativos
   */
  static async getPlanosAtivos(): Promise<Plano[]> {
    return await Plano.findAll({ 
      attributes: ['id', 'status', 'nome_plano', 'tipo_servico'],
      where: { status: 'ativo' }
    });
  }

  /**
   * Buscar títulos do período
   */
  static async getTitulosPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Titulo[]> {
    return await Titulo.findAll({ 
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
      where: {
        data_vencimento: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      }
    });
  }

  /**
   * Buscar todos os títulos
   */
  static async getAllTitulos(): Promise<Titulo[]> {
    return await Titulo.findAll({ 
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at']
    });
  }

  /**
   * Buscar títulos com filtros
   */
  static async getTitulos(where: any, attributes?: string[]): Promise<Titulo[]> {
    return await Titulo.findAll({
      attributes: attributes || ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
      where
    });
  }

  /**
   * Buscar clientes com filtros
   */
  static async getClientes(where: any, attributes?: string[]): Promise<Cliente[]> {
    return await Cliente.findAll({
      attributes: attributes || ['id', 'ativo', 'created_at'],
      where
    });
  }

  /**
   * Buscar títulos com includes
   */
  static async getTitulosWithIncludes(where: any, options?: { limit?: number; order?: any[]; include?: any[] }): Promise<Titulo[]> {
    const { TituloService } = await import('../../financeiro/TituloService');
    return await TituloService.findAllWithFilters(where, {
      include: options?.include || [],
      order: options?.order || [['created_at', 'DESC']],
      limit: options?.limit
    });
  }
}

