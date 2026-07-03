import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { SYSTEM_NAME } from '../../../constants/systemBrand';

export type IxcOsSyncEventType =
  | 'sync_batch'
  | 'os_abertura'
  | 'os_fechamento'
  | 'os_mensagem'
  | 'os_status'
  | 'os_sync';

export type IxcOsSyncTriggerType = 'scheduled' | 'manual' | 'create';
export type IxcOsSyncOrigemAbertura = 'ispconsultor' | 'ixc';

export interface RegistrarIxcOsSyncInput {
  empresaId?: number | null;
  integracaoId?: number | null;
  integracaoNome?: string | null;
  eventType: IxcOsSyncEventType;
  status?: 'success' | 'failed' | 'info';
  triggerType?: IxcOsSyncTriggerType;
  ordemServicoId?: number | null;
  ixcOsId?: string | null;
  protocolo?: string | null;
  clienteNome?: string | null;
  origemAbertura?: IxcOsSyncOrigemAbertura | null;
  operadorNome?: string | null;
  statusAnterior?: string | null;
  statusNovo?: string | null;
  message?: string | null;
}

const EVENT_LABELS: Record<IxcOsSyncEventType, string> = {
  sync_batch: 'Sincronização agendada',
  os_abertura: 'Abertura de OS',
  os_fechamento: 'Fechamento de OS',
  os_mensagem: 'Nova mensagem',
  os_status: 'Alteração de status',
  os_sync: 'Atualização de OS',
};

function buildMensagemResumo(input: RegistrarIxcOsSyncInput): string {
  if (input.message?.trim()) return input.message.trim();

  const evento = EVENT_LABELS[input.eventType] ?? input.eventType;
  const protocolo = input.protocolo?.trim();
  const osRef = protocolo ? `OS ${protocolo}` : input.ixcOsId ? `OS IXC #${input.ixcOsId}` : '';

  if (input.eventType === 'os_abertura') {
    const origem =
      input.origemAbertura === 'ixc'
        ? 'IXC Provedor'
        : SYSTEM_NAME;
    const operador = input.operadorNome?.trim();
    return `${evento}: ${osRef} via ${origem}${operador ? ` (${operador})` : ''}`;
  }

  if (input.eventType === 'os_fechamento') {
    const operador = input.operadorNome?.trim();
    return `${evento}: ${osRef}${operador ? ` por ${operador}` : ''}`;
  }

  if (input.eventType === 'os_status' && input.statusAnterior && input.statusNovo) {
    return `${evento}: ${osRef} ${input.statusAnterior} → ${input.statusNovo}`;
  }

  return `${evento}${osRef ? `: ${osRef}` : ''}`;
}

export class IxcOsSyncLogService {
  static registrar(input: RegistrarIxcOsSyncInput): void {
    SistemaLogOperacionalService.registrarIxcOsSync({
      empresaId: input.empresaId,
      integracaoId: input.integracaoId,
      integracaoNome: input.integracaoNome,
      eventType: input.eventType,
      status: input.status ?? 'info',
      triggerType: input.triggerType,
      ordemServicoId: input.ordemServicoId,
      ixcOsId: input.ixcOsId,
      protocolo: input.protocolo,
      clienteNome: input.clienteNome,
      origemAbertura: input.origemAbertura,
      operadorNome: input.operadorNome,
      statusAnterior: input.statusAnterior,
      statusNovo: input.statusNovo,
      message: buildMensagemResumo(input),
    });
  }
}
