import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface MensagemEmailAttributes {
  id: number;
  tipo: string;
  tipo_envio: 'desativado' | 'pdf';
  mensagem_padrao: string;
  mensagem_manual?: string;
  ativo: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type MensagemEmailCreationAttributes = Optional<MensagemEmailAttributes, 'id' | 'created_at' | 'updated_at'>;

export class MensagemEmail extends Model<MensagemEmailAttributes, MensagemEmailCreationAttributes> implements MensagemEmailAttributes {
  public id!: number;
  public tipo!: string;
  public tipo_envio!: 'desativado' | 'pdf';
  public mensagem_padrao!: string;
  public mensagem_manual?: string;
  public ativo!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

MensagemEmail.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  tipo_envio: {
    type: DataTypes.ENUM('desativado', 'pdf'),
    allowNull: false,
    defaultValue: 'pdf'
  },
  mensagem_padrao: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  mensagem_manual: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  ativo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
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
  tableName: 'mensagens_email',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default MensagemEmail;

