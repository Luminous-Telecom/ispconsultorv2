import { Op } from '../../../db/orm';
import { Cliente } from '../../../models/clientes/Cliente';
import { OrdemServicoMensagem } from '../../../models/ordens/OrdemServicoMensagem';
import { clienteNomeParaOrdemServico } from '../../ordens/clienteNomeOrdemServico';
import { OrdemServicoCadastroService } from '../../ordens/OrdemServicoCadastroService';
import {
  fetchUsuarioNomeById,
  OrdemServicoLocalService,
} from '../../ordens/OrdemServicoLocalService';
import { IXC_EVENTO_ABERTURA, IXC_EVENTO_FINALIZAR } from './constants';
import { parseClienteId } from './ossPayload';
import type { IxcOssChamado } from './types';

function resolveCadastroNome(mapa: Map<string, string>, referencia: string): string {
  const ref = String(referencia ?? '').trim();
  if (!ref || ref === '0') return '';
  return mapa.get(ref) ?? '';
}

export async function enrichOssChamadosFromIxc(
  registros: Array<Record<string, string>>,
  empresaId: number | null
): Promise<IxcOssChamado[]> {
  if (registros.length === 0) return [];

  const assuntoRefs = registros.map((r) => r.id_assunto);
  const estruturaRefs = registros.map((r) => r.id_estrutura);
  const setorRefs = registros.map((r) => r.setor);
  const tecnicoRefs = registros.map((r) => r.id_tecnico);
  const clienteIdxIds = [
    ...new Set(
      registros
        .map((r) => parseClienteId(r.idx))
        .filter((id): id is number => id != null)
    ),
  ];

  const ixcIds = registros.map((r) => String(r.id ?? '').trim()).filter(Boolean);
  const localRecords = await Promise.all(
    ixcIds.map((ixcId) => OrdemServicoLocalService.findByIxcId(ixcId, empresaId))
  );
  const localByIxcId = new Map(
    localRecords
      .filter((record): record is NonNullable<typeof record> => record != null)
      .map((record) => [String(record.ixc_id ?? '').trim(), record] as const)
  );
  const localOrdemIds = [...localByIxcId.values()].map((record) => record.id);

  const [assuntos, estruturas, setores, tecnicos, clientes, aberturas, finalizacoes] = await Promise.all([
    OrdemServicoCadastroService.lookupNomesPorReferencias('assunto', assuntoRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('estrutura', estruturaRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('setor', setorRefs, empresaId),
    OrdemServicoCadastroService.lookupNomesPorReferencias('tecnico', tecnicoRefs, empresaId),
    clienteIdxIds.length
      ? Cliente.findAll({
          where: { id: { [Op.in]: clienteIdxIds } },
          attributes: ['id', 'razao_social', 'nome_fantasia'],
        })
      : [],
    localOrdemIds.length
      ? OrdemServicoMensagem.findAll({
          where: {
            ordem_servico_id: { [Op.in]: localOrdemIds },
            id_evento: IXC_EVENTO_ABERTURA,
          },
        })
      : [],
    localOrdemIds.length
      ? OrdemServicoMensagem.findAll({
          where: {
            ordem_servico_id: { [Op.in]: localOrdemIds },
            id_evento: IXC_EVENTO_FINALIZAR,
          },
          order: [['id', 'DESC']],
        })
      : [],
  ]);

  const clienteNomes = new Map(
    clientes.map((cliente) => [cliente.id, clienteNomeParaOrdemServico(cliente, cliente.id)])
  );

  const operadorPorOrdemId = new Map<number, string>();
  const usuarioIds = [
    ...new Set(
      aberturas
        .map((item) => item.usuario_id)
        .filter((id): id is number => id != null && id > 0)
    ),
  ];
  const usuarioNomes = new Map<number, string>();
  await Promise.all(
    usuarioIds.map(async (usuarioId) => {
      const nome = await fetchUsuarioNomeById(usuarioId);
      if (nome) usuarioNomes.set(usuarioId, nome);
    })
  );
  for (const abertura of aberturas) {
    if (abertura.usuario_id == null || operadorPorOrdemId.has(abertura.ordem_servico_id)) continue;
    const nome = usuarioNomes.get(abertura.usuario_id) ?? '';
    if (nome) operadorPorOrdemId.set(abertura.ordem_servico_id, nome);
  }

  const respostaPorOrdemId = new Map<number, string>();
  for (const finalizacao of finalizacoes) {
    if (respostaPorOrdemId.has(finalizacao.ordem_servico_id)) continue;
    const texto = String(finalizacao.mensagem ?? '').trim();
    if (texto) respostaPorOrdemId.set(finalizacao.ordem_servico_id, texto);
  }

  return registros.map((registro) => {
    const ixcId = String(registro.id ?? '').trim();
    const localRecord = localByIxcId.get(ixcId);
    const clienteId = parseClienteId(registro.idx);
    const mensagemResposta =
      String(registro.mensagem_resposta ?? '').trim() ||
      (localRecord ? respostaPorOrdemId.get(localRecord.id) ?? '' : '');

    return {
      ...registro,
      id: ixcId,
      id_local: localRecord?.id != null ? String(localRecord.id) : '',
      ixc_id: ixcId,
      origem: 'ixc',
      cliente_id: clienteId != null ? String(clienteId) : String(registro.cliente_id ?? ''),
      protocolo: String(registro.protocolo ?? ''),
      status: String(registro.status ?? ''),
      mensagem: String(registro.mensagem ?? ''),
      mensagem_resposta: mensagemResposta,
      assunto_nome: resolveCadastroNome(assuntos, registro.id_assunto),
      estrutura_nome: resolveCadastroNome(estruturas, registro.id_estrutura),
      setor_nome: resolveCadastroNome(setores, registro.setor),
      tecnico_nome: resolveCadastroNome(tecnicos, registro.id_tecnico),
      cliente_nome: clienteId != null ? clienteNomes.get(clienteId) ?? '' : '',
      operador_nome: localRecord ? operadorPorOrdemId.get(localRecord.id) ?? '' : '',
    };
  });
}
