import { Op } from 'sequelize';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import SaasTitulo from '../../../models/saas/SaasTitulo';
import SaasParametros from '../../../models/saas/SaasParametros';

/**
 * Se a empresa (tenant) não tiver mais faturas em atraso (além do limite configurado), desbloqueia.
 */
export async function desbloquearSeSemAtraso(empresaId: number): Promise<void> {
  const parametros = await SaasParametros.findOne();
  const diasLimite = parametros?.dias_atraso_bloqueio ?? null;
  if (diasLimite == null || diasLimite <= 0) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() - diasLimite);

  const count = await SaasTitulo.count({
    where: {
      empresa_id: empresaId,
      pago: false,
      status: { [Op.in]: ['pendente', 'vencido'] },
      data_vencimento: { [Op.lte]: dataLimite },
    },
  });

  if (count === 0) {
    await DadosEmpresa.update({ bloqueado_por_atraso: false }, { where: { id: empresaId } });
  }
}

export interface BloqueioAtrasoInfo {
  bloqueado: boolean;
  titulo_id?: number;
  url_pagamento?: string | null;
  mensagem?: string;
}

/**
 * Verifica se o tenant está bloqueado por atraso e retorna dados para redirecionar ao pagamento.
 */
export async function getBloqueioAtrasoInfo(empresaId: number): Promise<BloqueioAtrasoInfo> {
  const empresa = await DadosEmpresa.findByPk(empresaId, {
    attributes: ['id', 'bloqueado_por_atraso', 'data_fim_desbloqueio_manual', 'razao_social', 'nome_fantasia'],
  });

  if (!empresa || !empresa.bloqueado_por_atraso) {
    return { bloqueado: false };
  }

  const hojeStr = new Date().toISOString().slice(0, 10);
  if (empresa.data_fim_desbloqueio_manual && empresa.data_fim_desbloqueio_manual >= hojeStr) {
    return { bloqueado: false };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const tituloAtraso = await SaasTitulo.findOne({
    where: {
      empresa_id: empresaId,
      pago: false,
      status: { [Op.in]: ['pendente', 'vencido'] },
      data_vencimento: { [Op.lt]: hoje },
    },
    order: [['data_vencimento', 'ASC']],
    attributes: ['id', 'url_boleto', 'numero_titulo', 'valor', 'data_vencimento'],
  });

  if (!tituloAtraso) {
    return {
      bloqueado: true,
      mensagem: 'Acesso bloqueado. Entre em contato com o suporte para regularizar sua fatura.',
    };
  }

  return {
    bloqueado: true,
    titulo_id: tituloAtraso.id,
    url_pagamento: tituloAtraso.url_boleto ?? null,
    mensagem: 'Acesso bloqueado devido a fatura em atraso. Efetue o pagamento para liberar o uso da plataforma.',
  };
}
