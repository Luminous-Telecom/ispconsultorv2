import { SaasTitulo } from '../../../models/saas/SaasTitulo';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { BancoApiService } from '../../bancos/BancoApiService';

/**
 * Gera boleto para SaasTitulo. Sacado vem do tenant (adm_sistema_tenants).
 * Adapta SaasPlano.nome -> nome_plano e usa bancoTable='saas_saas_bancos'.
 */
export class SaasTituloBoletoService {
  static async gerarBoleto(tituloId: number) {
    const titulo = await SaasTitulo.findByPk(tituloId, {
      include: [
        { model: SaasPlano, as: 'plano' },
        { model: SaasBanco, as: 'banco' },
      ],
    });

    if (!titulo) return { success: false, message: 'Título não encontrado' };

    const plano = titulo.get('plano') as SaasPlano | null;
    const banco = titulo.get('banco') as SaasBanco | null;

    if (!plano || !banco) {
      return { success: false, message: 'Plano ou banco não encontrado' };
    }

    if (banco.tipo_banco === 'bancario' || banco.tipo_banco === 'outros') {
      return { success: false, message: 'Banco não configurado para geração de boleto (Efi/Asaas)' };
    }

    const empresa = await DadosEmpresa.findByPk(titulo.empresa_id);
    if (!empresa) {
      return { success: false, message: 'Empresa (tenant) não encontrada para o título' };
    }

    const emp = empresa.get({ plain: true }) as Record<string, unknown>;
    const clienteData: Record<string, unknown> = {
      id: empresa.id,
      razao_social: emp.razao_social || emp.nome_fantasia || 'Sacado',
      nome_fantasia: emp.nome_fantasia || null,
      cnpj: emp.cnpj || '',
      email: emp.email || '',
      telefone: emp.telefone || emp.celular || null,
      cep: emp.cep || null,
      endereco: emp.endereco || null,
      numero: emp.numero || null,
      complemento: emp.complemento || null,
      bairro: emp.bairro || null,
      cidade: emp.cidade || null,
      estado: emp.estado || null,
    };

    const tituloData = titulo.get({ plain: true }) as Record<string, unknown>;
    const planoData = plano.get({ plain: true }) as Record<string, unknown>;
    const bancoData = banco.get({ plain: true }) as Record<string, unknown>;

    const tituloLike = {
      ...tituloData,
      cliente: clienteData,
      banco: bancoData,
      plano: { ...planoData, nome_plano: planoData.nome ?? planoData.nome_plano },
    } as unknown as Parameters<typeof BancoApiService.gerarTitulo>[0];

    const resultado = await BancoApiService.gerarTitulo(tituloLike, { bancoTable: 'saas_saas_bancos' });

    if (resultado.success && resultado.data?.charge_id) {
      const d = resultado.data as Record<string, unknown>;
      await SaasTitulo.update(
        {
          charge_id: typeof d.charge_id === 'string' ? d.charge_id : null,
          url_boleto: typeof d.url_boleto === 'string' ? d.url_boleto : null,
          codigo_barras: typeof d.codigo_barras === 'string' ? d.codigo_barras : null,
          linha_digitavel: typeof d.linha_digitavel === 'string' ? d.linha_digitavel : null,
          qrcode: typeof d.qrcode === 'string' ? d.qrcode : null,
          qrcode_image: typeof d.qrcode_image === 'string' ? d.qrcode_image : null,
        },
        { where: { id: tituloId } }
      );
    }

    return resultado;
  }
}
