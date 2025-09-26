import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface ScheduledRoutineAttributes {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  configuracao: any; // JSON
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao: string;
  dia_semana?: number;
  cron_expression?: string;
  ativo: boolean;
  ultima_execucao?: Date;
  proxima_execucao?: Date;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: Date;
  updated_at: Date;
}

interface ScheduledRoutineCreationAttributes extends Optional<ScheduledRoutineAttributes, 'id' | 'descricao' | 'dia_execucao' | 'dia_semana' | 'cron_expression' | 'ultima_execucao' | 'proxima_execucao' | 'total_execucoes' | 'execucoes_com_sucesso' | 'execucoes_com_erro' | 'created_at' | 'updated_at'> {}

class ScheduledRoutine extends Model<ScheduledRoutineAttributes, ScheduledRoutineCreationAttributes> implements ScheduledRoutineAttributes {
  public id!: number;
  public nome!: string;
  public tipo!: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  public descricao?: string;
  public configuracao!: any;
  public frequencia!: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  public dia_execucao?: number;
  public hora_execucao!: string;
  public dia_semana?: number;
  public cron_expression?: string;
  public ativo!: boolean;
  public ultima_execucao?: Date;
  public proxima_execucao?: Date;
  public total_execucoes!: number;
  public execucoes_com_sucesso!: number;
  public execucoes_com_erro!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Associações
  public getExecutionLogs!: () => Promise<any[]>;
  public addExecutionLog!: (log: any) => Promise<any>;
  public countExecutionLogs!: () => Promise<number>;
}

ScheduledRoutine.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Nome da rotina (ex: Geração de Títulos Mensais)'
  },
  tipo: {
    type: DataTypes.ENUM('geracao_titulos', 'envio_boletos', 'remessa_bancaria', 'outros'),
    allowNull: false,
    comment: 'Tipo da rotina'
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição detalhada da rotina'
  },
  configuracao: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Configurações específicas da rotina (JSON)'
  },
  frequencia: {
    type: DataTypes.ENUM('diaria', 'semanal', 'mensal', 'anual', 'personalizada'),
    allowNull: false,
    comment: 'Frequência de execução'
  },
  dia_execucao: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Dia do mês para execução (1-31)'
  },
  hora_execucao: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '00:00:00',
    comment: 'Hora de execução'
  },
  dia_semana: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Dia da semana (0=domingo, 1=segunda, etc.)'
  },
  cron_expression: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Expressão cron personalizada'
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Se a rotina está ativa'
  },
  ultima_execucao: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora da última execução'
  },
  proxima_execucao: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data e hora da próxima execução'
  },
  total_execucoes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total de execuções realizadas'
  },
  execucoes_com_sucesso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total de execuções com sucesso'
  },
  execucoes_com_erro: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total de execuções com erro'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'scheduled_routines',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default ScheduledRoutine;
