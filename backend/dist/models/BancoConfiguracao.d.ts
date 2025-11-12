import { Model, CreationOptional, InferAttributes, InferCreationAttributes, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import { Banco } from './Banco';
type ConfiguracaoValor = string | number | boolean | null;
export declare class BancoConfiguracao extends Model<InferAttributes<BancoConfiguracao>, InferCreationAttributes<BancoConfiguracao>> {
    id: CreationOptional<number>;
    banco_id: number;
    tipo_banco: string;
    configuracao: Record<string, ConfiguracaoValor>;
    ativo: boolean;
    observacoes: string | null;
    created_at: CreationOptional<Date>;
    updated_at: CreationOptional<Date>;
    getBanco: BelongsToGetAssociationMixin<Banco>;
    setBanco: BelongsToSetAssociationMixin<Banco, number>;
    createBanco: BelongsToCreateAssociationMixin<Banco>;
    static findAtivas(): Promise<BancoConfiguracao[]>;
    static findByTipo(tipoBanco: string): Promise<BancoConfiguracao[]>;
    getConfiguracaoPorChave(chave: string): Promise<ConfiguracaoValor>;
    setConfiguracaoPorChave(chave: string, valor: ConfiguracaoValor): Promise<void>;
    removeConfiguracaoPorChave(chave: string): Promise<void>;
    validarConfiguracao(): Promise<{
        valida: boolean;
        erros: string[];
    }>;
}
export {};
//# sourceMappingURL=BancoConfiguracao.d.ts.map