import {
  actionErrorMessage,
  createIxcClient,
  nowIxcDateTime,
  sanitizeInput,
  wrapIxcError,
} from '../IxcOssChamadoService/ixcHttp';
import { resolveApiOperadorContext } from '../IxcOssChamadoService/ossUsuarioContext';
import {
  ATENDIMENTO_DEFAULTS,
  applyAtendimentoTipoEstrutura,
  applyResponsavelToIxcBody,
  IXC_ATENDIMENTO_RESOURCE,
  IXC_CAMPO_RESPONSAVEL_TECNICO,
  IXC_TRANSFERENCIA_RESOURCE,
  readResponsavelFromIxcRegistro,
} from './constants';
import type { AtendimentoInput, IxcActionResponse } from './types';

function normalizeIxcId(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').trim();
  return normalized && normalized !== '0' ? normalized : '';
}

function stripAtendimentoCamposEnriquecidos(registro: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(registro)) {
    if (key.endsWith('_nome')) continue;
    if (key === 'cliente_id') continue;
    result[key] = String(value ?? '');
  }
  return result;
}

function isIxcRecursoIndisponivel(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('não está disponível') ||
    msg.includes('nao esta disponivel') ||
    msg.includes('not found') ||
    msg.includes('404')
  );
}

async function putAcaoAtendimento(
  ixcId: string,
  acao: string,
  body: Record<string, string>
): Promise<void> {
  const response = await createIxcClient().request<IxcActionResponse>({
    method: 'PUT',
    url: `/${IXC_ATENDIMENTO_RESOURCE}/${ixcId}`,
    headers: { ixcsoft: acao },
    data: body,
  });

  if (response.data?.type === 'error') {
    throw new Error(actionErrorMessage(response.data, `Erro ao executar ${acao} no atendimento IXC`));
  }
}

function buildAcaoAtendimentoBody(
  atual: Record<string, string>,
  payload: AtendimentoInput,
  mergedBody: Record<string, string> = {}
): Record<string, string> {
  const body: Record<string, string> = {
    ...ATENDIMENTO_DEFAULTS,
    ...stripAtendimentoCamposEnriquecidos(atual),
    ...mergedBody,
    ...sanitizeInput(payload),
  };

  applyAtendimentoTipoEstrutura(body);

  applyResponsavelToIxcBody(
    body,
    body.id_responsavel_technico ?? payload.id_responsavel_technico
  );

  for (const [campo, valorPadrao] of Object.entries(ATENDIMENTO_DEFAULTS)) {
    const valor = String(body[campo] ?? '').trim();
    if (!valor) {
      body[campo] = valorPadrao;
    }
  }

  return body;
}

async function postTransferenciaAtendimento(body: Record<string, string>): Promise<void> {
  const response = await createIxcClient().request<IxcActionResponse>({
    method: 'POST',
    url: `/${IXC_TRANSFERENCIA_RESOURCE}`,
    headers: { ixcsoft: 'incluir' },
    data: body,
  });

  if (response.data?.type === 'error') {
    throw new Error(
      actionErrorMessage(response.data, 'Erro ao registrar transferência de atendimento no IXC')
    );
  }
}

/**
 * Fallback: assumir/transferir colaborador ou departamento via `su_transf_atendimento`
 * quando o PUT direto em `su_ticket` não aplicar a alteração.
 */
async function executarAssumirAtendimento(
  ixcId: string,
  departamentoId: string,
  responsavelTechnico: string
): Promise<void> {
  const body: Record<string, string> = {
    id_atendimento: ixcId,
    status_transf: '1',
    id_departamento_origem: departamentoId,
    id_departamento_destino: departamentoId,
    id_responsavel_tecnico: responsavelTechnico,
    data_transferencia: nowIxcDateTime(),
  };

  try {
    await postTransferenciaAtendimento(body);
  } catch (error) {
    if (!isIxcRecursoIndisponivel(error)) {
      throw wrapIxcError(error, 'Erro ao assumir atendimento no IXC');
    }
  }
}

async function executarTransferirAtendimento(
  ixcId: string,
  atual: Record<string, string>,
  payload: AtendimentoInput,
  mergedBody: Record<string, string>,
  departamentoOrigem: string,
  departamentoDestino: string,
  responsavelTechnico: string
): Promise<void> {
  const transferBody: Record<string, string> = {
    id_atendimento: ixcId,
    status_transf: '0',
    id_departamento_origem: departamentoOrigem,
    id_departamento_destino: departamentoDestino,
    data_transferencia: nowIxcDateTime(),
  };

  if (responsavelTechnico) {
    transferBody.id_responsavel_tecnico = responsavelTechnico;
  }

  try {
    await postTransferenciaAtendimento(transferBody);
    return;
  } catch (error) {
    if (!isIxcRecursoIndisponivel(error)) {
      throw wrapIxcError(error, 'Erro ao transferir atendimento no IXC');
    }
  }

  const body = buildAcaoAtendimentoBody(atual, payload, mergedBody);
  body.id_ticket_setor = departamentoDestino;
  if (responsavelTechnico) {
    body.id_responsavel_technico = responsavelTechnico;
  }

  const strategies: Array<{ acao: string; label: string }> = [
    { acao: 'transferir', label: 'transferir' },
    { acao: 'alterar', label: 'alterar' },
  ];

  let lastError: Error | null = null;

  for (const { acao, label } of strategies) {
    try {
      await putAcaoAtendimento(ixcId, acao, body);
      return;
    } catch (putError) {
      const err = wrapIxcError(putError, `Erro ao ${label} atendimento no IXC`);
      if (isIxcRecursoIndisponivel(err) || isIxcRecursoIndisponivel(putError)) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw (
    lastError ??
    new Error(
      'O IXC não disponibilizou rota para atribuir colaborador responsável (POST su_transf_atendimento ou PUT transferir em su_ticket). ' +
        'No IXC: habilite a rota incluir em Transferência de atendimento (su_transf_atendimento) e/ou PUT transferir em Atendimentos.'
    )
  );
}

export type SyncResponsavelIxcOptions = {
  /**
   * Quando false, `atual` veio do espelho local (ticket não listável pela API).
   * Nesse caso não comparar com o local — o IXC pode ainda não ter colaborador/depto.
   */
  atualVeioDoIxc?: boolean;
};

export function deveSincronizarResponsavelNoIxc(
  atual: Record<string, string>,
  payload: AtendimentoInput,
  body: Record<string, string> = {},
  options: SyncResponsavelIxcOptions = {}
): {
  responsavelAlvo: string;
  departamentoAlvo: string;
  mudouResponsavel: boolean;
  mudouDepartamento: boolean;
} {
  const responsavelAlvo = normalizeIxcId(
    payload.id_responsavel_technico ??
      body.id_responsavel_technico ??
      body[IXC_CAMPO_RESPONSAVEL_TECNICO]
  );
  const departamentoAlvo = normalizeIxcId(payload.id_ticket_setor ?? body.id_ticket_setor);

  const atualVeioDoIxc = options.atualVeioDoIxc !== false;
  const responsavelAtual = atualVeioDoIxc ? normalizeIxcId(readResponsavelFromIxcRegistro(atual)) : '';
  const departamentoAtual = atualVeioDoIxc ? normalizeIxcId(atual.id_ticket_setor) : '';

  const mudouResponsavel = Boolean(responsavelAlvo && responsavelAlvo !== responsavelAtual);
  const mudouDepartamento = Boolean(departamentoAlvo && departamentoAlvo !== departamentoAtual);

  return {
    responsavelAlvo,
    departamentoAlvo: departamentoAlvo || departamentoAtual,
    mudouResponsavel,
    mudouDepartamento,
  };
}

/**
 * Fallback de sincronização via `su_transf_atendimento` (depto/responsável).
 * Colaborador responsável em atendimentos deve ir em POST/PUT `su_ticket.id_responsavel_tecnico`.
 */
export async function syncResponsavelEDepartamentoNoIxc(
  ixcId: string,
  atual: Record<string, string>,
  payload: AtendimentoInput,
  body: Record<string, string> = {},
  options: SyncResponsavelIxcOptions = {}
): Promise<void> {
  const { responsavelAlvo, departamentoAlvo, mudouResponsavel, mudouDepartamento } =
    deveSincronizarResponsavelNoIxc(atual, payload, body, options);

  if (!mudouResponsavel && !mudouDepartamento) return;

  const departamentoDestino = departamentoAlvo || normalizeIxcId(atual.id_ticket_setor);
  const departamentoOrigem = normalizeIxcId(atual.id_ticket_setor) || departamentoDestino;

  if (!departamentoDestino) {
    throw new Error('Selecione o departamento antes de definir o colaborador responsável');
  }

  const { funcionarioId } = await resolveApiOperadorContext();
  const responsavelAssumir = funcionarioId || responsavelAlvo;

  if (responsavelAssumir) {
    try {
      await executarAssumirAtendimento(ixcId, departamentoOrigem, responsavelAssumir);
    } catch {
      // best-effort: transferência pode seguir mesmo se assumir falhar
    }
  }

  await executarTransferirAtendimento(
    ixcId,
    atual,
    payload,
    body,
    departamentoOrigem,
    departamentoDestino,
    responsavelAlvo
  );
}
