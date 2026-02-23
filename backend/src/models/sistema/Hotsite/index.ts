import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../../config/database';

export interface HotsiteAttributes {
  id: number;
  empresa_id?: number | null;
  html: string;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
}

export type HotsiteCreationAttributes = Omit<HotsiteAttributes, 'id' | 'created_at' | 'updated_at'>;

export class Hotsite extends Model<HotsiteAttributes, HotsiteCreationAttributes> implements HotsiteAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public html!: string;
  public ativo!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  static associate() {
    // Sem associações
  }
}

Hotsite.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  html: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
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
  tableName: 'hotsites',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Hotsite;

