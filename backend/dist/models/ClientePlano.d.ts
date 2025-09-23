import { Model, CreationOptional, InferAttributes, InferCreationAttributes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import { Cliente } from './Cliente';
import { Plano } from './Plano';
export declare class ClientePlano extends Model<InferAttributes<ClientePlano>, InferCreationAttributes<ClientePlano>> {
    id: CreationOptional<number>;
    cliente_id: number;
    plano_id: number;
    desconto_percentual: number | null;
    desconto_valor: number | null;
    valor_final: number | null;
    data_inicio: Date | null;
    data_fim: Date | null;
    status: 'ativo' | 'inativo' | 'suspenso';
    observacoes: string | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
    getCliente: BelongsToGetAssociationMixin<Cliente>;
    setCliente: BelongsToSetAssociationMixin<Cliente, number>;
    createCliente: BelongsToCreateAssociationMixin<Cliente>;
    getPlano: BelongsToGetAssociationMixin<Plano>;
    setPlano: BelongsToSetAssociationMixin<Plano, number>;
    createPlano: BelongsToCreateAssociationMixin<Plano>;
    static findAtivos(): Promise<ClientePlano[]>;
    getValorFinal(): Promise<number>;
    isVigente(): Promise<boolean>;
    getDiasRestantes(): Promise<number | null>;
}
//# sourceMappingURL=ClientePlano.d.ts.map