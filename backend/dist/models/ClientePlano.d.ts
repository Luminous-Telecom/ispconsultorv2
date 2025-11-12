import { Model, CreationOptional, InferAttributes, InferCreationAttributes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import { Cliente } from './Cliente';
import { Plano } from './Plano';
import { Banco } from './Banco';
export declare class Contrato extends Model<InferAttributes<Contrato>, InferCreationAttributes<Contrato>> {
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
    isento_mensalidade: boolean;
    dia_vencimento: number | null;
    conta_boleto: number | null;
    data_validade_desconto: Date | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
    getCliente: BelongsToGetAssociationMixin<Cliente>;
    setCliente: BelongsToSetAssociationMixin<Cliente, number>;
    createCliente: BelongsToCreateAssociationMixin<Cliente>;
    getPlano: BelongsToGetAssociationMixin<Plano>;
    setPlano: BelongsToSetAssociationMixin<Plano, number>;
    createPlano: BelongsToCreateAssociationMixin<Plano>;
    getBancoBoleto: BelongsToGetAssociationMixin<Banco>;
    setBancoBoleto: BelongsToSetAssociationMixin<Banco, number>;
    createBancoBoleto: BelongsToCreateAssociationMixin<Banco>;
    static findAtivos(): Promise<Contrato[]>;
    getValorFinal(): Promise<number>;
    isVigente(): Promise<boolean>;
    getDiasRestantes(): Promise<number | null>;
}
//# sourceMappingURL=ClientePlano.d.ts.map