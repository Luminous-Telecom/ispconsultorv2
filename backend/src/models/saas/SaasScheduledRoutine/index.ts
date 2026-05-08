import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatCreatedAt } from '../../../utils/dateUtils';

export interface SaasScheduledRoutineAttributes {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'bloquear_saas_atraso' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'outros';
  /** saas = cobrança do produto; erp_global = uma rotina para todos os clientes do ERP */
  alvo: 'saas' | 'erp_global';
  /** Token cron (dia da semana); coluna VARCHAR após migration 00000205 */
  dia_semana?: string;
  minuto: string;
  hora: string;
  dia_mes: string;
  mes: string;
  ativo: boolean;
  proxima_execucao: Date;
  ultima_execucao?: Date;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: Date;
  updated_at: Date;
}

export type SaasScheduledRoutineCreationAttributes = Optional<
  SaasScheduledRoutineAttributes,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'ultima_execucao'
  | 'total_execucoes'
  | 'execucoes_com_sucesso'
  | 'execucoes_com_erro'
  | 'alvo'
  | 'minuto'
  | 'hora'
  | 'dia_mes'
  | 'mes'
  | 'dia_semana'
>;

export class SaasScheduledRoutine extends Model<SaasScheduledRoutineAttributes, SaasScheduledRoutineCreationAttributes> implements SaasScheduledRoutineAttributes {
  public id!: number;
  public nome!: string;
  public tipo!: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'bloquear_saas_atraso' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'outros';
  public alvo!: 'saas' | 'erp_global';
  public dia_semana?: string;
  public minuto!: string;
  public hora!: string;
  public dia_mes!: string;
  public mes!: string;
  public ativo!: boolean;
  public proxima_execucao!: Date;
  public ultima_execucao?: Date;
  public total_execucoes!: number;
  public execucoes_com_sucesso!: number;
  public execucoes_com_erro!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  getUltimaExecucaoFormatada(): string | null {
    if (!this.ultima_execucao) return null;
    return formatCreatedAt(this.getDataValue('ultima_execucao'));
  }

  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as unknown as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    json.ultima_execucao_formatada = this.getUltimaExecucaoFormatada();
    return json;
  }
}

SaasScheduledRoutine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'verificar_vencimentos', 'desbloquear_blockdomi', 'bloquear_saas_atraso', 'backup_equipamentos_ssh', 'rpki_sync_parent_resources', 'rpki_sync_repositories', 'outros'),
      allowNull: false
    },
    alvo: {
      type: DataTypes.ENUM('saas', 'erp_global'),
      allowNull: false,
      defaultValue: 'saas'
    },
    dia_semana: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: '*'
    },
    minuto: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: '*'
    },
    hora: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: '*'
    },
    dia_mes: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: '*'
    },
    mes: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: '*'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    proxima_execucao: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ultima_execucao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_execucoes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    execucoes_com_sucesso: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    execucoes_com_erro: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    tableName: 'saas_saas_scheduled_routines',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default SaasScheduledRoutine;
