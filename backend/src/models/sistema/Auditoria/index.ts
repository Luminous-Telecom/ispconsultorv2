/**
 * Model de Auditoria
 * Registra ações críticas do sistema
 */
import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  BelongsToGetAssociationMixin
} from 'sequelize';
import { sequelize } from '../../../config/database';
import { Usuario } from '../../cadastros/Usuario';

export type AcaoAuditoria = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import';

export class Auditoria extends Model<
  InferAttributes<Auditoria>,
  InferCreationAttributes<Auditoria>
> {
  declare id: CreationOptional<number>;
  declare usuario_id: number | null;
  declare acao: AcaoAuditoria;
  declare entidade: string;
  declare entidade_id: number | null;
  declare dados_anteriores: Record<string, unknown> | null;
  declare dados_novos: Record<string, unknown> | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare observacoes: string | null;
  declare created_at: CreationOptional<Date>;

  // Relacionamentos
  declare getUsuario: BelongsToGetAssociationMixin<Usuario>;

  /**
   * Sobrescrever toJSON para garantir que dados_anteriores e dados_novos sejam retornados corretamente
   */
  toJSON(): Record<string, unknown> {
    const json = this.get({ plain: true }) as Record<string, unknown>;
    
    // Garantir que dados_anteriores e dados_novos sejam objetos válidos
    if (json.dados_anteriores && typeof json.dados_anteriores === 'string') {
      try {
        json.dados_anteriores = JSON.parse(json.dados_anteriores);
      } catch {
        json.dados_anteriores = null;
      }
    }
    if (json.dados_novos && typeof json.dados_novos === 'string') {
      try {
        json.dados_novos = JSON.parse(json.dados_novos);
      } catch {
        json.dados_novos = null;
      }
    }
    
    return json;
  }
}

Auditoria.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    acao: {
      type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'export', 'import'),
      allowNull: false
    },
    entidade: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entidade_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dados_anteriores: {
      type: DataTypes.JSON,
      allowNull: true
    },
    dados_novos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'auditoria',
    timestamps: false, // Usamos created_at manualmente
    underscored: true,
    hooks: {
      beforeSave: (auditoria: Auditoria) => {
        // Garantir que dados_anteriores e dados_novos sejam objetos válidos
        if (auditoria.dados_anteriores && typeof auditoria.dados_anteriores === 'object') {
          // Converter para JSON string se necessário para garantir serialização completa
          try {
            JSON.stringify(auditoria.dados_anteriores);
          } catch (e) {
            // Se não puder serializar, limpar campos problemáticos
            const cleaned: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(auditoria.dados_anteriores)) {
              try {
                JSON.stringify(value);
                cleaned[key] = value;
              } catch {
                // Ignorar campos que não podem ser serializados
              }
            }
            auditoria.dados_anteriores = cleaned;
          }
        }
        if (auditoria.dados_novos && typeof auditoria.dados_novos === 'object') {
          // Converter para JSON string se necessário para garantir serialização completa
          try {
            JSON.stringify(auditoria.dados_novos);
          } catch (e) {
            // Se não puder serializar, limpar campos problemáticos
            const cleaned: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(auditoria.dados_novos)) {
              try {
                JSON.stringify(value);
                cleaned[key] = value;
              } catch {
                // Ignorar campos que não podem ser serializados
              }
            }
            auditoria.dados_novos = cleaned;
          }
        }
      }
    },
    indexes: [
      { fields: ['usuario_id'] },
      { fields: ['acao'] },
      { fields: ['entidade'] },
      { fields: ['entidade_id'] },
      { fields: ['created_at'] },
      { fields: ['entidade', 'entidade_id'] },
      { fields: ['usuario_id', 'created_at'] }
    ]
  }
);

// Relacionamentos serão definidos no models/index.ts para evitar duplicação

export default Auditoria;

