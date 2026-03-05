import { Op } from 'sequelize';
import { SaasTitulo } from '../../../../models/saas/SaasTitulo';

export type EmpresaDefaults = Map<
  number,
  { conta_boleto: number; dia_vencimento_id: number; dia: number }
>;

/**
 * Carrega dados relacionados aos contratos SaaS (títulos).
 * empresaToClienteBancoDia é preenchido por loadEmpresaDefaults.
 */
export class SaasContratoDataLoader {
  static async loadRelatedData(
    contratoIds: number[],
    empresaToClienteBancoDia: EmpresaDefaults
  ) {
    const titulosEmAbertoTodos = await SaasTitulo.findAll({
      where: {
        contrato_id: { [Op.in]: contratoIds },
        status: ['pendente', 'vencido'],
        pago: false,
      },
      attributes: ['id', 'contrato_id', 'data_vencimento'],
    });

    const todosTitulosTodos = await SaasTitulo.findAll({
      where: {
        contrato_id: { [Op.in]: contratoIds },
        status: { [Op.ne]: 'cancelado' },
      },
      attributes: ['id', 'contrato_id', 'data_vencimento', 'status'],
    });

    const titulosEmAbertoPorContrato = new Map<
      number,
      Array<{ contrato_id: number | null; data_vencimento: Date }>
    >();
    const todosTitulosPorContrato = new Map<
      number,
      Array<{ contrato_id: number | null; data_vencimento: Date; status?: string }>
    >();

    titulosEmAbertoTodos.forEach((t) => {
      const cid = t.contrato_id;
      if (cid != null) {
        if (!titulosEmAbertoPorContrato.has(cid)) titulosEmAbertoPorContrato.set(cid, []);
        titulosEmAbertoPorContrato.get(cid)!.push({
          contrato_id: cid,
          data_vencimento: t.data_vencimento,
        });
      }
    });

    todosTitulosTodos.forEach((t) => {
      const cid = t.contrato_id;
      if (cid != null) {
        if (!todosTitulosPorContrato.has(cid)) todosTitulosPorContrato.set(cid, []);
        todosTitulosPorContrato.get(cid)!.push({
          contrato_id: cid,
          data_vencimento: t.data_vencimento,
          status: t.status,
        });
      }
    });

    return {
      titulosEmAbertoPorContrato,
      todosTitulosPorContrato,
    };
  }

  /**
   * Obtém para cada empresa: primeiro banco ativo, primeiro dia vencimento ativo.
   * Sacado do boleto vem de saas_dados_empresa (empresa/tenant).
   */
  static async loadEmpresaDefaults(empresaIds: number[]): Promise<EmpresaDefaults> {
    const { SaasBanco } = await import('../../../../models/saas/SaasBanco');
    const { SaasDiasVencimento } = await import('../../../../models/saas/SaasDiasVencimento');

    const [bancos, diasVenc] = await Promise.all([
      SaasBanco.findAll({
        where: { empresa_id: { [Op.in]: empresaIds }, ativo: true },
        attributes: ['id', 'empresa_id'],
        order: [['id', 'ASC']],
      }),
      SaasDiasVencimento.findAll({
        where: { empresa_id: { [Op.in]: empresaIds }, ativo: true },
        attributes: ['id', 'empresa_id', 'dia', 'dia_padrao'],
        order: [['id', 'ASC']],
      }),
    ]);

    const mapa: EmpresaDefaults = new Map();

    for (const empId of empresaIds) {
      const banco = bancos.find((b) => b.empresa_id === empId);
      const diaVenc = diasVenc.find((d) => d.empresa_id === empId);

      if (banco && diaVenc) {
        const dia = diaVenc.dia ?? diaVenc.dia_padrao ?? 10;
        mapa.set(empId, {
          conta_boleto: banco.id,
          dia_vencimento_id: diaVenc.id,
          dia,
        });
      }
    }

    return mapa;
  }
}
