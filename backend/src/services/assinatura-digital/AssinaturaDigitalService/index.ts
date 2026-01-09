import { AssinaturaDigital } from '../../../models/assinatura-digital/AssinaturaDigital';
import { TermoContrato } from '../../../models/contratos/TermoContrato';
import { Cliente } from '../../../models/clientes/Cliente';

export interface ListAssinaturasFilters {
  status?: string;
  cliente_id?: string | number;
  termo_contrato_id?: string | number;
}

export class AssinaturaDigitalService {
  /**
   * Listar assinaturas com filtros
   */
  static async list(filters: ListAssinaturasFilters): Promise<AssinaturaDigital[]> {
    const where: Record<string, unknown> = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.cliente_id) {
      where.cliente_id = filters.cliente_id;
    }
    if (filters.termo_contrato_id) {
      where.termo_contrato_id = filters.termo_contrato_id;
    }

    return await AssinaturaDigital.findAll({
      where,
      include: [
        {
          model: TermoContrato,
          as: 'termoContrato',
          required: false,
          attributes: ['id', 'tipo_termo', 'assinado']
        },
        {
          model: Cliente,
          as: 'cliente',
          required: false,
          attributes: ['id', 'nome', 'email', 'cpf_cnpj']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Buscar assinatura por ID
   */
  static async getById(id: string | number): Promise<AssinaturaDigital | null> {
    return await AssinaturaDigital.findByPk(id, {
      include: [
        {
          model: TermoContrato,
          as: 'termoContrato',
          required: false
        },
        {
          model: Cliente,
          as: 'cliente',
          required: false
        }
      ]
    });
  }

  /**
   * Buscar assinatura por termo_contrato_id
   */
  static async getByTermoContrato(termoContratoId: number): Promise<AssinaturaDigital | null> {
    return await AssinaturaDigital.findOne({
      where: { termo_contrato_id: termoContratoId }
    });
  }

  /**
   * Buscar assinatura por api_document_id (aceita string ou number)
   */
  static async getByApiDocumentId(apiDocumentId: string | number): Promise<AssinaturaDigital | null> {
    // Tentar primeiro como string
    let assinatura = await AssinaturaDigital.findOne({
      where: { api_document_id: String(apiDocumentId) }
    });

    // Se não encontrou e é um número, tentar como número
    if (!assinatura && !isNaN(Number(apiDocumentId))) {
      assinatura = await AssinaturaDigital.findOne({
        where: { api_document_id: Number(apiDocumentId) }
      });
    }

    return assinatura;
  }

  /**
   * Buscar assinatura por api_document_id com apenas atributos específicos
   */
  static async getByApiDocumentIdWithAttributes(
    apiDocumentId: string | number,
    attributes: string[]
  ): Promise<AssinaturaDigital | null> {
    let assinatura = await AssinaturaDigital.findOne({
      where: { api_document_id: String(apiDocumentId) },
      attributes
    });

    if (!assinatura && !isNaN(Number(apiDocumentId))) {
      assinatura = await AssinaturaDigital.findOne({
        where: { api_document_id: Number(apiDocumentId) },
        attributes
      });
    }

    return assinatura;
  }

  /**
   * Atualizar assinatura por ID usando update em massa
   */
  static async updateById(id: number, dados: Partial<AssinaturaDigital>): Promise<void> {
    await AssinaturaDigital.update(dados, {
      where: { id }
    });
  }

  /**
   * Criar assinatura
   */
  static async create(dados: Partial<AssinaturaDigital>): Promise<AssinaturaDigital> {
    return await AssinaturaDigital.create(dados as any);
  }

  /**
   * Atualizar assinatura
   */
  static async update(id: string | number, dados: Partial<AssinaturaDigital>): Promise<AssinaturaDigital> {
    const assinatura = await AssinaturaDigital.findByPk(id);
    
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }
    
    await assinatura.update(dados);
    await assinatura.reload();
    
    return assinatura;
  }

  /**
   * Deletar assinatura
   */
  static async delete(id: string | number): Promise<AssinaturaDigital> {
    const assinatura = await AssinaturaDigital.findByPk(id);
    
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }
    
    await assinatura.destroy();
    
    return assinatura;
  }
}

