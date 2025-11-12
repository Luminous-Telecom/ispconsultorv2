import { Cliente } from '../models/Cliente';
import { Contrato } from '../models/Contrato';
import { Titulo } from '../models/Titulo';
interface DadosVariaveis {
    cliente?: Cliente;
    contrato?: Contrato | (Partial<Contrato> & {
        id: number;
    });
    titulo?: Titulo;
    dataReferencia?: Date;
}
export declare class VariaveisDocumentoService {
    private static logoCache;
    static getVariaveisDisponiveis(): {
        cliente: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
        contrato: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
        empresa: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
        financeiro: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
        titulo: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
        sistema: {
            titulo: string;
            variaveis: {
                variavel: string;
                descricao: string;
            }[];
        };
    };
    static processarVariaveis(conteudo: string, dados: DadosVariaveis): Promise<string>;
    private static obterNomeEstado;
    private static processarVariaveisCliente;
    private static processarVariaveisContrato;
    private static processarVariaveisTitulo;
    private static processarVariaveisFinanceiro;
    private static processarVariaveisSistema;
    private static imagemParaBase64;
    private static processarVariaveisEmpresa;
    private static formatarMoeda;
    private static formatarData;
    private static formatarHora;
    private static formatarDataHora;
}
export {};
//# sourceMappingURL=VariaveisDocumentoService.d.ts.map