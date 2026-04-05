import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';
import type { JsonValue } from '../../../types/index';
import { formatCreatedAt } from '../../../utils/dateUtils';

export interface SaasScheduledRoutineAttributes {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'bloquear_saas_atraso' | 'backup_equipamentos_ssh' | 'outros';
  /** saas = cobrança do produto; erp_global = uma rotina para todos os clientes do ERP */
  alvo: 'saas' | 'erp_global';
  descricao?: string;
  configuracao: Record<string, JsonValue>;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao: string;
  dia_semana?: number;
  cron_expression?: string;
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
  'id' | 'created_at' | 'updated_at' | 'ultima_execucao' | 'total_execucoes' | 'execucoes_com_sucesso' | 'execucoes_com_erro' | 'alvo'
>;

export class SaasScheduledRoutine extends Model<SaasScheduledRoutineAttributes, SaasScheduledRoutineCreationAttributes> implements SaasScheduledRoutineAttributes {
  public id!: number;
  public nome!: string;
  public tipo!: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'bloquear_saas_atraso' | 'backup_equipamentos_ssh' | 'outros';
  public alvo!: 'saas' | 'erp_global';
  public descricao?: string;
  public configuracao!: Record<string, JsonValue>;
  public frequencia!: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  public dia_execucao?: number;
  public hora_execucao!: string;
  public dia_semana?: number;
  public cron_expression?: string;
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
      type: DataTypes.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'verificar_vencimentos', 'desbloquear_blockdomi', 'bloquear_saas_atraso', 'backup_equipamentos_ssh', 'outros'),
      allowNull: false
    },
    alvo: {
      type: DataTypes.ENUM('saas', 'erp_global'),
      allowNull: false,
      defaultValue: 'saas'
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    configuracao: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    frequencia: {
      type: DataTypes.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
      allowNull: false
    },
    dia_execucao: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 31 }
    },
    hora_execucao: {
      type: DataTypes.TIME,
      allowNull: false
    },
    dia_semana: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 6 }
    },
    cron_expression: {
      type: DataTypes.STRING(255),
      allowNull: true
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
    tableName: 'saas_scheduled_routines',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default SaasScheduledRoutine;
