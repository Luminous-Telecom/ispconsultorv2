"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DadosEmpresaController = void 0;
const DadosEmpresa_1 = require("../models/DadosEmpresa");
class DadosEmpresaController {
    static async get(req, res) {
        try {
            let dadosEmpresa = await DadosEmpresa_1.DadosEmpresa.findOne();
            if (!dadosEmpresa) {
                dadosEmpresa = await DadosEmpresa_1.DadosEmpresa.create({
                    razao_social: '',
                    nome_fantasia: '',
                    cnpj: '',
                    inscricao_estadual: '',
                    inscricao_municipal: '',
                    cep: '',
                    endereco: '',
                    numero: '',
                    complemento: '',
                    bairro: '',
                    cidade: '',
                    estado: '',
                    telefone: '',
                    celular: '',
                    email: '',
                    site: '',
                    responsavel_nome: '',
                    responsavel_cpf: '',
                    responsavel_cargo: '',
                    logo: null
                });
            }
            res.json(dadosEmpresa);
        }
        catch (error) {
            console.error('Erro ao buscar dados da empresa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async update(req, res) {
        try {
            const dadosAtualizados = req.body;
            let dadosEmpresa = await DadosEmpresa_1.DadosEmpresa.findOne();
            if (!dadosEmpresa) {
                dadosEmpresa = await DadosEmpresa_1.DadosEmpresa.create(dadosAtualizados);
            }
            else {
                await dadosEmpresa.update(dadosAtualizados);
            }
            res.json(dadosEmpresa);
        }
        catch (error) {
            console.error('Erro ao atualizar dados da empresa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.DadosEmpresaController = DadosEmpresaController;
//# sourceMappingURL=DadosEmpresaController.js.map