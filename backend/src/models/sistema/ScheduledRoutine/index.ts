import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';
import type { JsonValue } from '../../../types/index';
import { formatCreatedAt } from '../../../utils/dateUtils';

export interface ScheduledRoutineAttributes {
  id: number;
  empresa_id?: number | null;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'outros';
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

export type ScheduledRoutineCreationAttributes = Optional<ScheduledRoutineAttributes, 'id' | 'created_at' | 'updated_at' | 'ultima_execucao' | 'total_execucoes' | 'execucoes_com_sucesso' | 'execucoes_com_erro'>;

export class ScheduledRoutine extends Model<ScheduledRoutineAttributes, ScheduledRoutineCreationAttributes> implements ScheduledRoutineAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public nome!: string;
  public tipo!: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'outros';
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

  /**
   * Formata created_at para exibição (sem conversão de timezone)
   */
  getCreatedAtFormatada(): string | null {
    if (!this.created_at) return null;
    return formatCreatedAt(this.getDataValue('created_at'));
  }

  /**
   * Formata ultima_execucao para exibição (sem conversão de timezone)
   */
  getUltimaExecucaoFormatada(): string | null {
    if (!this.ultima_execucao) return null;
    return formatCreatedAt(this.getDataValue('ultima_execucao'));
  }

  /**
   * Sobrescrever toJSON para incluir created_at_formatada e ultima_execucao_formatada
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as unknown as Record<string, unknown>;
    json.created_at_formatada = this.getCreatedAtFormatada();
    json.ultima_execucao_formatada = this.getUltimaExecucaoFormatada();
    return json;
  }
}

ScheduledRoutine.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  nome: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM(
      'geracao_titulos',
      'envio_boletos',
      'remessa_bancaria',
      'verificar_vencimentos',
      'desbloquear_blockdomi',
      'backup_equipamentos_ssh',
      'rpki_sync_parent_resources',
      'rpki_sync_repositories',
      'outros'
    ),
    allowNull: false
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
    validate: {
      min: 1,
      max: 31
    }
  },
  hora_execucao: {
    type: DataTypes.TIME,
    allowNull: false
  },
  dia_semana: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 6
    }
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
}, {
  sequelize,
  tableName: 'adm_sistema_scheduled_routines',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ScheduledRoutine;