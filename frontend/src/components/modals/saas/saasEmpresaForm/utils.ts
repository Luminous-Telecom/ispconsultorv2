import type { SaasContrato, SaasTitulo } from 'services/saas/saasCrudService';
import type { SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import type { SaasEmpresaExtended, SaasEmpresaForm } from './types';

export function empresaToForm(d: SaasEmpresaExtended): SaasEmpresaForm {
  return {
    razao_social: d.razao_social ?? '',
    nome_fantasia: d.nome_fantasia ?? '',
    cnpj: d.cnpj ?? '',
    email: d.email ?? '',
    telefone: d.telefone ?? '',
    celular: d.celular ?? '',
    cep: d.cep ?? '',
    endereco: d.endereco ?? '',
    numero: d.numero ?? '',
    complemento: d.complemento ?? '',
    bairro: d.bairro ?? '',
    cidade: d.cidade ?? '',
    estado: d.estado ?? '',
    responsavel_nome: d.responsavel_nome ?? '',
    responsavel_cpf: d.responsavel_cpf ?? '',
    responsavel_cargo: d.responsavel_cargo ?? '',
    site: d.site ?? '',
  };
}

export function buildSubmitPayload(form: SaasEmpresaForm): Record<string, unknown> {
  return {
    razao_social: form.razao_social,
    nome_fantasia: form.nome_fantasia || null,
    cnpj: form.cnpj,
    email: form.email,
    telefone: form.telefone || null,
    celular: form.celular || null,
    cep: form.cep || '',
    endereco: form.endereco || '',
    numero: form.numero || '',
    complemento: form.complemento || null,
    bairro: form.bairro || '',
    cidade: form.cidade || '',
    estado: form.estado || '',
    responsavel_nome: form.responsavel_nome,
    responsavel_cpf: form.responsavel_cpf,
    responsavel_cargo: form.responsavel_cargo || null,
    site: form.site || null,
  };
}

export function filterTitulosRaw(titulosRaw: SaasTitulo[], search: string): SaasTitulo[] {
  const term = (search || '').toLowerCase().trim();
  if (!term) return titulosRaw;
  return titulosRaw.filter((titulo) => {
    const id = String(titulo.id);
    const numero = (titulo.numero_titulo ?? '').toLowerCase();
    const valor = String(titulo.valor ?? '');
    const status = String(titulo.status ?? '').toLowerCase();
    const plano = (titulo.plano?.nome ?? '').toLowerCase();
    return id.includes(term) || numero.includes(term) || valor.includes(term) || status.includes(term) || plano.includes(term);
  });
}

export function filterTitulosByCancelados(titulos: SaasTitulo[], showCancelados: boolean): SaasTitulo[] {
  if (showCancelados) return titulos;
  return titulos.filter((titulo) => (titulo as { status?: string }).status !== 'cancelado');
}

export function filterContratos(
  contratosRaw: SaasContrato[],
  search: string,
  showInativos: boolean
): SaasContrato[] {
  let list = contratosRaw;
  if (!showInativos) {
    list = list.filter((c) => c.status === 'ativo');
  }
  const term = (search || '').toLowerCase().trim();
  if (!term) return list;
  return list.filter((c) => {
    const plano = (c.plano?.nome ?? '').toLowerCase();
    const status = String(c.status).toLowerCase();
    const id = String(c.id);
    const valor = String(c.valor ?? '');
    return id.includes(term) || plano.includes(term) || status.includes(term) || valor.includes(term);
  });
}

export function filterUsuarios(
  usuariosRaw: SaasTenantUsuario[],
  search: string,
  searchField: string
): SaasTenantUsuario[] {
  const term = (search || '').toLowerCase().trim();
  if (!term) return usuariosRaw;
  const field = searchField || 'nome';
  return usuariosRaw.filter((u) => {
    const val = field === 'id'
      ? String(u.id)
      : String((u as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
    return (field === 'id' ? val : val).toLowerCase().includes(term);
  });
}

export function getFormDataForAddress(form: SaasEmpresaForm) {
  return {
    cep: form.cep,
    endereco: form.endereco,
    numero: form.numero,
    complemento: form.complemento,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: form.estado,
  };
}
