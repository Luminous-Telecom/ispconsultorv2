export type LogsModalType =
  | 'equipamentos'
  | 'agentes'
  | 'usuarios'
  | 'agenda-tarefas'
  | 'email'
  | 'whatsapp'
  | 'assinatura-digital'
  | 'acesso-sistema'
  | 'blockdomi-api';

export interface MensagemItem {
  id: number;
  /** Id real no banco (lista SaaS mescla ERP + SaaS com id deslocado em ERP) */
  historico_id_real?: number;
  tipo: 'email' | 'whatsapp';
  titulo?: string;
  destinatario: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  cliente_nome?: string;
  empresa_id?: number;
  empresa_nome?: string | null;
  empresa?: {
    id?: number;
    razao_social?: string | null;
    nome_fantasia?: string | null;
    nome_empresa?: string | null;
  } | null;
  usuario?: { id: number; nome: string; email: string };
  created_at: string;
}

export interface LogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  logType?: LogsModalType;
  /** Origem ERP vs SaaS — definido pelo registro de modais (não inferir pela URL). */
  variant?: 'erp' | 'saas';
}
