import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../../config/database';

export type AssinaturaDigitalProviderType = 'assinafy' | 'zapsign';

interface AssinaturaDigitalProviderAttributes {
  id: number;
  empresa_id?: number | null;
  provider: AssinaturaDigitalProviderType;
  habilitado: boolean;
  api_key: string | null;
  account_id: string | null; // Específico para Assinafy (Workspace Account ID)
  configuracao_extra: Record<string, unknown> | null; // JSON para campos específicos de cada provider
  dias_expiracao_padrao: number;
  created_at?: Date;
  updated_at?: Date;
}

type AssinaturaDigitalProviderCreationAttributes = Optional<
  AssinaturaDigitalProviderAttributes,
  'id' | 'created_at' | 'updated_at' | 'account_id' | 'configuracao_extra'
>;

class AssinaturaDigitalProvider extends Model<
  AssinaturaDigitalProviderAttributes,
  AssinaturaDigitalProviderCreationAttributes
> implements AssinaturaDigitalProviderAttributes {
  public id!: number;
  public empresa_id?: number | null;
  public provider!: AssinaturaDigitalProviderType;
  public habilitado!: boolean;
  public api_key!: string | null;
  public account_id!: string | null;
  public configuracao_extra!: Record<string, unknown> | null;
  public dias_expiracao_padrao!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AssinaturaDigitalProvider.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    provider: {
      type: DataTypes.ENUM('assinafy', 'zapsign'),
      allowNull: false,
      unique: true,
      comment: 'Tipo do provider de assinatura digital'
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se o provider está habilitado'
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'API Key do provider'
    },
    account_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Account ID específico (ex: Workspace Account ID da Assinafy)'
    },
    configuracao_extra: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Configurações extras específicas do provider em formato JSON'
    },
    dias_expiracao_padrao: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Dias padrão para expiração de documentos'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'adm_assinatura_digital_providers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['provider']
      },
      {
        fields: ['habilitado']
      }
    ]
  }
);

export default AssinaturaDigitalProvider;

