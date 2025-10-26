import { Request, Response } from 'express';
import { DadosEmpresa } from '../models/DadosEmpresa';

export class DadosEmpresaController {
  static async get(req: Request, res: Response): Promise<void> {
    try {
      // Buscar dados da empresa (singleton - sempre retorna o primeiro registro)
      let dadosEmpresa = await DadosEmpresa.findOne();

      // Se não existir dados, criar um registro padrão
      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create({
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
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const dadosAtualizados = req.body;

      // Buscar ou criar dados da empresa
      let dadosEmpresa = await DadosEmpresa.findOne();

      if (!dadosEmpresa) {
        // Criar novo registro se não existir
        dadosEmpresa = await DadosEmpresa.create(dadosAtualizados);
      } else {
        // Atualizar registro existente
        await dadosEmpresa.update(dadosAtualizados);
      }

      res.json(dadosEmpresa);
    } catch (error) {
      console.error('Erro ao atualizar dados da empresa:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Arquivo não enviado' });
        return;
      }

      const filePath = `/uploads/empresa/${req.file.filename}`;

      let dadosEmpresa = await DadosEmpresa.findOne();
      if (!dadosEmpresa) {
        dadosEmpresa = await DadosEmpresa.create({
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
          logo: filePath
        });
      } else {
        await dadosEmpresa.update({ logo: filePath });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({ success: true, logo: `${baseUrl}${filePath}` });
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}