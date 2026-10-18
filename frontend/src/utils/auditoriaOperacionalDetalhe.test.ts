import { enrichAuditoriaLogFromOperacionalPayload } from './auditoriaOperacionalDetalhe';
import type { AuditoriaLog } from 'services/auditoriaService';

function baseLog(partial: Partial<AuditoriaLog>): AuditoriaLog {
  return {
    id: '1',
    timestamp: '2026-10-18T00:00:00.000Z',
    acao: 'update',
    entidade: 'ModeloDocumento',
    entidade_id: 1,
    usuario_id: 1,
    usuario_nome: 'Admin',
    usuario_email: null,
    empresa_id: 1,
    empresa_nome: null,
    ip_address: '::1',
    user_agent: null,
    rota: null,
    metodo_http: null,
    observacoes: null,
    dados_anteriores: null,
    dados_novos: null,
    payload: null,
    ...partial,
  };
}

it('usa só dados_novos do payload mesmo quando há dados_anteriores antigos', () => {
  const log = enrichAuditoriaLogFromOperacionalPayload(
    baseLog({
      payload: {
        dados_anteriores: { nome: 'Antigo' },
        dados_novos: { nome: 'Novo' },
      },
    })
  );
  expect(log.dados_novos).toEqual({ nome: 'Novo' });
  expect(log.dados_anteriores).toBeNull();
});
