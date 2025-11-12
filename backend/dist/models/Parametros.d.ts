import { Model, Optional } from 'sequelize';
interface ParametrosAttributes {
    id: number;
    validar_cpf_cnpj: boolean;
    gerar_titulos_automatico: boolean;
    titulos_vence_sabado: boolean;
    auto_lancamento_titulos: boolean;
    total_titulos_financeiro: number;
    created_at?: Date;
    updated_at?: Date;
}
type ParametrosCreationAttributes = Optional<ParametrosAttributes, 'id' | 'created_at' | 'updated_at'>;
declare class Parametros extends Model<ParametrosAttributes, ParametrosCreationAttributes> implements ParametrosAttributes {
    id: number;
    validar_cpf_cnpj: boolean;
    gerar_titulos_automatico: boolean;
    titulos_vence_sabado: boolean;
    auto_lancamento_titulos: boolean;
    total_titulos_financeiro: number;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default Parametros;
//# sourceMappingURL=Parametros.d.ts.map