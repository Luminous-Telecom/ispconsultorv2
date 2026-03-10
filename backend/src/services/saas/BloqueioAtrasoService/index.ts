import SaasDadosEmpresa from '../../../models/saas/SaasDadosEmpresa';
import SaasTitulo from '../../../models/saas/SaasTitulo';
import { Op } from 'sequelize';

export interface BloqueioAtrasoInfo {
  bloqueado: boolean;
  titulo_id?: number;
  url_pagamento?: string | null;
  mensagem?: string;
}

/**
 * Verifica se a empresa está bloqueada por atraso e retorna dados para redirecionar ao pagamento.
 */
export async function getBloqueioAtrasoInfo(empresaId: number): Promise<BloqueioAtrasoInfo> {
  const empresa = await SaasDadosEmpresa.findByPk(empresaId, {
    attributes: ['id', 'bloqueado_por_atraso', 'nome_empresa']
  });

  if (!empresa || !empresa.bloqueado_por_atraso) {
    return { bloqueado: false };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const tituloAtraso = await SaasTitulo.findOne({
    where: {
      empresa_id: empresaId,
      pago: false,
      status: { [Op.in]: ['pendente', 'vencido'] },
      data_vencimento: { [Op.lt]: hoje }
    },
    order: [['data_vencimento', 'ASC']],
    attributes: ['id', 'url_boleto', 'numero_titulo', 'valor', 'data_vencimento']
  });

  if (!tituloAtraso) {
    return {
      bloqueado: true,
      mensagem: 'Acesso bloqueado. Entre em contato com o suporte para regularizar sua fatura.'
    };
  }

  return {
    bloqueado: true,
    titulo_id: tituloAtraso.id,
    url_pagamento: tituloAtraso.url_boleto ?? null,
    mensagem: 'Acesso bloqueado devido a fatura em atraso. Efetue o pagamento para liberar o uso da plataforma.'
  };
}
