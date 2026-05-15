import type { TituloComRelacoes } from './types';

/** Converte SaasTitulo (com empresa) para TituloComRelacoes (com cliente) para reaproveitar o template de boleto do ADM. */
export function saasTituloToTituloComRelacoes(saasTitulo: {
  get: (o: { plain: boolean }) => Record<string, unknown>;
  empresa?: { get?: (o: { plain: boolean }) => Record<string, unknown> } | Record<string, unknown> | null;
  plano?: { get?: (o: { plain: boolean }) => Record<string, unknown> } | Record<string, unknown> | null;
  banco?: unknown;
}): TituloComRelacoes {
  const tituloData = typeof saasTitulo.get === 'function' ? saasTitulo.get({ plain: true }) : (saasTitulo as Record<string, unknown>);
  const emp = saasTitulo.empresa;
  const empPlain = (typeof emp?.get === 'function' ? emp.get({ plain: true }) : emp) as Record<string, unknown> | undefined;
  const cliente = {
    id: empPlain?.id ?? tituloData.empresa_id,
    razao_social: String(empPlain?.razao_social ?? empPlain?.nome_fantasia ?? ''),
    nome: String(empPlain?.nome_fantasia ?? empPlain?.razao_social ?? ''),
    cnpj: empPlain?.cnpj ? String(empPlain.cnpj) : undefined,
    cpf: empPlain?.cpf ? String(empPlain.cpf) : undefined,
    endereco: empPlain?.endereco ? String(empPlain.endereco) : undefined,
    numero: empPlain?.numero ? String(empPlain.numero) : undefined,
    complemento: empPlain?.complemento ? String(empPlain.complemento) : undefined,
    bairro: empPlain?.bairro ? String(empPlain.bairro) : undefined,
    cidade: empPlain?.cidade ? String(empPlain.cidade) : undefined,
    estado: empPlain?.estado ? String(empPlain.estado) : undefined,
    cep: empPlain?.cep ? String(empPlain.cep) : undefined,
  };
  const planoPlain = (typeof saasTitulo.plano?.get === 'function' ? saasTitulo.plano.get({ plain: true }) : saasTitulo.plano) as Record<string, unknown> | undefined;
  return {
    ...tituloData,
    cliente,
    banco: saasTitulo.banco,
    plano: planoPlain ? { ...planoPlain, nome_plano: planoPlain.nome ?? planoPlain.nome_plano } : undefined,
  } as unknown as TituloComRelacoes;
}
