import type { comunicacao_servidores_email, comunicacao_servidores_whatsapp } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../utils/comunicacaoEmpresaWhere';

async function primeiroAtivo<T>(
  buscar: (where: { empresa_id: number; ativo: boolean; id?: number; padrao?: boolean }) => Promise<T | null>,
  empresaId: number | null | undefined,
  servidorId?: number | null
): Promise<T | null> {
  const base = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
  if (!base) return null;

  if (servidorId != null && servidorId > 0) {
    const especifico = await buscar({ ...base, id: servidorId } as { empresa_id: number; ativo: boolean; id: number });
    if (especifico) return especifico;
  }

  const padrao = await buscar({ ...base, padrao: true } as { empresa_id: number; ativo: boolean; padrao: boolean });
  if (padrao) return padrao;

  return buscar(base as { empresa_id: number; ativo: boolean });
}

export async function resolverServidorWhatsAppCobranca(
  empresaId: number | null | undefined,
  servidorId?: number | null
): Promise<comunicacao_servidores_whatsapp | null> {
  return primeiroAtivo(
    (where) => prisma.comunicacao_servidores_whatsapp.findFirst({
      where,
      orderBy: [{ padrao: 'desc' }, { id: 'asc' }],
    }),
    empresaId,
    servidorId
  );
}

async function aplicarFlagPadraoNaTabela(
  updateMany: (args: { where: { empresa_id: number; padrao: boolean; id?: { not: number } }; data: { padrao: boolean; updated_at: Date } }) => Promise<unknown>,
  findFirst: (args: { where: { empresa_id: number; padrao: boolean; id?: { not: number } }; select: { id: boolean } }) => Promise<{ id: number } | null>,
  empresaId: number,
  servidorId: number | null,
  padrao: boolean | undefined
): Promise<boolean> {
  const whereOutros = {
    empresa_id: empresaId,
    padrao: true,
    ...(servidorId ? { id: { not: servidorId } } : {}),
  };
  if (padrao === true) {
    await updateMany({ where: whereOutros, data: { padrao: false, updated_at: new Date() } });
    return true;
  }
  if (padrao === false) return false;
  const outro = await findFirst({ where: whereOutros, select: { id: true } });
  return !outro;
}

export async function aplicarFlagPadrao(
  tabela: 'comunicacao_servidores_whatsapp' | 'comunicacao_servidores_email',
  empresaId: number,
  servidorId: number | null,
  padrao: boolean | undefined
): Promise<boolean> {
  if (tabela === 'comunicacao_servidores_whatsapp') {
    return aplicarFlagPadraoNaTabela(
      (args) => prisma.comunicacao_servidores_whatsapp.updateMany(args),
      (args) => prisma.comunicacao_servidores_whatsapp.findFirst(args),
      empresaId,
      servidorId,
      padrao
    );
  }
  return aplicarFlagPadraoNaTabela(
    (args) => prisma.comunicacao_servidores_email.updateMany(args),
    (args) => prisma.comunicacao_servidores_email.findFirst(args),
    empresaId,
    servidorId,
    padrao
  );
}

export async function resolverServidorEmailCobranca(
  empresaId: number | null | undefined,
  servidorId?: number | null
): Promise<comunicacao_servidores_email | null> {
  return primeiroAtivo(
    (where) => prisma.comunicacao_servidores_email.findFirst({
      where,
      orderBy: [{ padrao: 'desc' }, { id: 'asc' }],
    }),
    empresaId,
    servidorId
  );
}
